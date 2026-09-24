import { Controller, Post, Get, Delete, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { BillsService } from './bills.service';
import { pipeline } from 'stream/promises';
import * as fs from 'fs';
import * as path from 'path';

const pdfExtract = require('pdf-extraction');

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post('upload')
  async uploadAndExtractBill(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    if (!req.isMultipart()) {
      return res.status(HttpStatus.BAD_REQUEST).send({ error: 'Debe ser multipart/form-data' });
    }

    const data = await req.file();
    if (!data) {
      return res.status(HttpStatus.BAD_REQUEST).send({ error: 'No se encontró el PDF' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'bills');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${data.filename.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, filename);
    await pipeline(data.file, fs.createWriteStream(filePath));

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfExtract(dataBuffer);
      const text = pdfData.text; 

      const fallbackDate = new Date().toISOString().split('T')[0]; 
      let billData: any = { 
        document_url: `/uploads/bills/${filename}`,
        issue_date: fallbackDate,
        due_date: fallbackDate
      };

      // ---------------------------------------------------------
      // LÓGICA DE EXTRACCIÓN: PORTOAGUAS
      // ---------------------------------------------------------
      if (text.includes('PORTOAGUAS')) {
        billData.service_type = 'AGUA';
        billData.company_name = 'PORTOAGUAS EP';
        
        billData.invoice_number = text.match(/Nro\.[\s\S]*?(\d{3}-\d{3}-\d{9})/)?.[1] || 'Desconocido';
        billData.address = text.match(/Dirección:[\s\n]+([^\n]+)/)?.[1]?.trim() || 'No especificada';
        billData.phone = text.match(/Teléfono:[\s\n]+([0-9;]+)/)?.[1]?.trim() || 'No especificado';
        
        const issueRaw = text.match(/Fecha Emisión:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1];
        if (issueRaw) billData.issue_date = issueRaw.split('/').reverse().join('-'); 
        
        const dueRaw = text.match(/Fecha máxima de pago:[\s\S]*?(\d{4}-\d{2}-\d{2})/)?.[1];
        if (dueRaw) billData.due_date = dueRaw; 
        
        billData.subtotal = parseFloat(text.match(/SUBTOTAL SIN IMPUESTOS[\s\S]*?([\d\.]+)/)?.[1] || '0');
        billData.third_party_taxes = parseFloat(text.match(/TOTAL RUBROS TERCEROS[\s\S]*?([\d\.]+)/)?.[1] || '0');
        billData.total_amount = parseFloat(text.match(/VALOR TOTAL[\s\S]*?([\d\.]+)/)?.[1] || '0');
        
      } 
      // ---------------------------------------------------------
      // LÓGICA DE EXTRACCIÓN: CNEL
      // ---------------------------------------------------------
      else if (text.includes('CNEL')) {
        billData.service_type = 'LUZ';
        billData.company_name = 'CNEL EP';
        
        billData.invoice_number = text.match(/Nro\.\s*Factura[\s\S]*?(\d{3}-\d{3}-\d{9})/)?.[1] || 'Desconocido';
        
        // EXTRACCIÓN INFALIBLE USANDO LA PÁGINA 2 (Recibo de Bomberos)
        // Busca todo el texto entre "Dirección Servicio" y la palabra "CONCEPTO"
        const addressMatch = text.match(/Dirección Servicio\s+([\s\S]+?)CONCEPTO/i);
        if (addressMatch) {
          billData.address = addressMatch[1]
            .replace(/\r?\n/g, ' ') // Cambia saltos de línea por espacios
            .replace(/\s{2,}/g, ' ') // Elimina espacios dobles
            .trim();
        } else {
          billData.address = 'No especificada';
        }

        billData.phone = null;
        
        const cnelDates = text.match(/\d{2}-\d{2}-\d{4}/g);
        if (cnelDates && cnelDates.length >= 2) {
          billData.issue_date = cnelDates[0].split('-').reverse().join('-'); 
          billData.due_date = cnelDates[1].split('-').reverse().join('-');   
        }
        
        billData.subtotal = parseFloat(text.match(/TOTAL SE Y AP \(1\)[\s\S]*?([\d\.]+)/)?.[1] || '0');
        billData.third_party_taxes = parseFloat(text.match(/TOTAL CONTRIBUCIÓN BOMBEROS \(4\)[\s\S]*?([\d\.]+)/)?.[1] || '0');
        billData.total_amount = parseFloat(text.match(/VALOR TOTAL \(USD\)[\s\S]*?([\d\.]+)/)?.[1] || '0');
      } else {
        throw new Error('Formato de planilla no reconocido. Solo se acepta CNEL o Portoaguas.');
      }

      const savedBill = await this.billsService.createBill(billData);
      
      return res.status(HttpStatus.CREATED).send({
        message: 'Planilla procesada con éxito. Datos sensibles omitidos.',
        data: savedBill
      });

    } catch (error) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: (error as Error).message || 'Error procesando el PDF' });
    }
  }

  @Get()
  async getAllBills(@Res() res: FastifyReply) {
    const bills = await this.billsService.findAll();
    return res.status(HttpStatus.OK).send(bills);
  }

  @Delete(':id')
  async deleteBill(@Param('id') id: string, @Res() res: FastifyReply) {
    try {
      const billId = parseInt(id, 10);
      if (isNaN(billId)) {
        return res.status(HttpStatus.BAD_REQUEST).send({ error: 'El ID debe ser un número válido' });
      }

      const bill = await this.billsService.findOne(billId);

      if (bill.document_url) {
        const relativePath = bill.document_url.startsWith('/') ? bill.document_url.substring(1) : bill.document_url;
        const filePath = path.join(process.cwd(), relativePath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await this.billsService.remove(billId);

      return res.status(HttpStatus.OK).send({ 
        message: `Planilla con ID ${billId} y su archivo PDF fueron eliminados correctamente.` 
      });

    } catch (error) {
      const err = error as any;
      console.error(err);
      if (err.status === 404) {
        return res.status(HttpStatus.NOT_FOUND).send({ error: err.message });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: 'Error interno al intentar eliminar' });
    }
  }
}