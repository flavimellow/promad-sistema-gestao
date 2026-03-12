// ═══════════════════════════════════════════
//  PROMAD · Exportação Excel — Módulo Financeiro
//  Arquivo: backend/routes/financeiro_export.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');
const ExcelJS = require('exceljs');

function fmtData(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}
function fmtVal(v) {
  return v ? parseFloat(v) : 0;
}

// GET /api/financeiro/exportar/:comp_id?tipo=direto|indireto
router.get('/exportar/:comp_id', async (req, res) => {
  try {
    const { tipo } = req.query;
    const comp_id  = req.params.comp_id;

    // Buscar competência
    const { rows: comps } = await pool.query('SELECT * FROM competencias WHERE id=$1', [comp_id]);
    if (!comps.length) return res.status(404).json({ erro: 'Competência não encontrada' });
    const comp = comps[0];

    // Buscar resumo por empresa
    let sql = `
      SELECT
        e.nom AS em_nom, e.cnj AS em_cnj,
        cb.tipo_contrato,
        json_agg(json_build_object(
          'ap_nom',      a.nom,
          'ct_ini',      ct.ini,
          'ct_fim',      ct.fim,
          'vl_uniforme', cb.vl_uniforme,
          'vl_curso',    cb.vl_curso,
          'vl_material', cb.vl_material,
          'vl_total',    cb.vl_total
        ) ORDER BY a.nom) AS aprendizes,
        SUM(cb.vl_total) AS total_geral,
        COUNT(*)         AS qtd
      FROM cobrancas cb
      JOIN empresas   e  ON e.id  = cb.em_id
      JOIN aprendizes a  ON a.id  = cb.ap_id
      JOIN contratos  ct ON ct.id = cb.contrato_id
      WHERE cb.competencia_id = $1
    `;
    const params = [comp_id];
    if (tipo) { params.push(tipo); sql += ` AND cb.tipo_contrato = $${params.length}`; }
    sql += ' GROUP BY e.nom, e.cnj, cb.tipo_contrato ORDER BY e.nom';
    const { rows: empresas } = await pool.query(sql, params);

    // Criar workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(comp.descricao);

    // Cores baseadas no modelo original
    const VERDE_ESC  = '0C1F13';
    const VERDE_MED  = '1A4D2E';
    const AMARELO    = 'F5C518';
    const CINZA_CLR  = 'F2F2F2';
    const BRANCO     = 'FFFFFF';

    const tipoLabel = tipo === 'indireto'
      ? 'Tabela de Controle de Contratos INDIRETOS'
      : 'Planilha de Controle Empresas Diversas';
    const cursoLabel = tipo === 'indireto' ? 'Custo Mensal' : 'Curso';

    // Linha 1: título
    ws.mergeCells('A1:I1');
    const tit = ws.getCell('A1');
    tit.value = `${tipoLabel} – ${comp.descricao}`;
    tit.font = { bold: true, size: 13, color: { argb: BRANCO } };
    tit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_ESC } };
    tit.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    // Linha 2: cabeçalho das colunas
    ws.getRow(2).height = 20;
    const headers = ['Empresa', 'Nome do Aprendiz', 'Início', 'Fim',
                     'Uniforme', cursoLabel, 'Mat. Didático', 'Total Aprendiz', 'Total Geral'];
    headers.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h;
      cell.font  = { bold: true, color: { argb: BRANCO }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MED } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: AMARELO } },
        bottom: { style: 'thin', color: { argb: AMARELO } },
      };
    });

    // Larguras das colunas
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 11;
    ws.getColumn(6).width = 13;
    ws.getColumn(7).width = 14;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 14;

    let linha = 3;
    let totalAprendizes = 0;
    let totalGeral = 0;

    for (const emp of empresas) {
      const aps = emp.aprendizes;
      const empLabel = emp.em_cnj ? `${emp.em_nom}  CNPJ: ${emp.em_cnj}` : emp.em_nom;

      // Linhas de aprendizes
      aps.forEach((ap, idx) => {
        const row = ws.getRow(linha);
        row.height = 18;
        const isEven = idx % 2 === 0;

        // Empresa: só na primeira linha do grupo
        const cellEmp = ws.getCell(linha, 1);
        if (idx === 0) {
          cellEmp.value = empLabel;
          cellEmp.font  = { bold: true, size: 9 };
        }
        cellEmp.fill = { type: 'pattern', pattern: 'solid',
                         fgColor: { argb: isEven ? CINZA_CLR : BRANCO } };

        const vals = [
          ap.ap_nom,
          fmtData(ap.ct_ini),
          fmtData(ap.ct_fim),
          fmtVal(ap.vl_uniforme) || null,
          fmtVal(ap.vl_curso),
          fmtVal(ap.vl_material) || null,
          fmtVal(ap.vl_total),
          null  // Total Geral — só na linha de total
        ];
        vals.forEach((v, i) => {
          const cell = ws.getCell(linha, i + 2);
          cell.value = v;
          cell.font  = { size: 9 };
          cell.fill  = { type: 'pattern', pattern: 'solid',
                         fgColor: { argb: isEven ? CINZA_CLR : BRANCO } };
          if (i >= 2 && v !== null) {
            cell.numFmt = '"R$"#,##0.00';
            cell.alignment = { horizontal: 'right' };
          }
        });
        linha++;
      });

      // Linha de total por empresa
      const rowTot = ws.getRow(linha);
      rowTot.height = 18;
      const totalEmp = fmtVal(emp.total_geral);

      ws.getCell(linha, 1).value = `${aps.length}`;
      ws.getCell(linha, 2).value = 'Total';
      ws.getCell(linha, 9).value = totalEmp;
      ws.getCell(linha, 9).numFmt = '"R$"#,##0.00';
      ws.getCell(linha, 9).alignment = { horizontal: 'right' };

      for (let c = 1; c <= 9; c++) {
        const cell = ws.getCell(linha, c);
        cell.font = { bold: true, size: 9, color: { argb: BRANCO } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MED } };
      }

      totalAprendizes += aps.length;
      totalGeral += totalEmp;
      linha += 2; // linha em branco entre empresas
    }

    // Linha de total geral
    ws.getCell(linha, 1).value = 'Total de Aprendizes';
    ws.getCell(linha, 2).value = 'Total Geral';
    ws.getCell(linha, 9).value = totalGeral;
    ws.getCell(linha, 9).numFmt = '"R$"#,##0.00';
    ws.getCell(linha, 9).alignment = { horizontal: 'right' };
    ws.getCell(linha + 1, 1).value = totalAprendizes;

    for (let c = 1; c <= 9; c++) {
      const cell = ws.getCell(linha, c);
      cell.font = { bold: true, size: 10, color: { argb: BRANCO } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_ESC } };
    }

    // Assinatura
    ws.getCell(linha + 3, 1).value = 'Atenciosamente,';
    ws.getCell(linha + 4, 8).value = 'Maria Aparecida Pereira';
    ws.getCell(linha + 5, 8).value = 'Coordenadora do PROMAD';
    ws.getCell(linha + 4, 8).font = { bold: true, size: 9 };
    ws.getCell(linha + 5, 8).font = { italic: true, size: 9 };

    // Enviar arquivo
    const tipoFile = tipo || 'todos';
    const nomeArq = `PROMAD_Financeiro_${tipoFile}_${comp.descricao.replace(/ /g,'_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArq}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
