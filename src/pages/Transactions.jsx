// src/pages/Transactions.jsx
import { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message } from "antd";
import { supabase } from "../lib/supabase";

// ===== pdfmake (รองรับไทย) =====
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "../fonts/vfs_fonts.js";
pdfMake.vfs = pdfFonts.vfs;
// บาง environment จะได้ pdfFonts.vfs, บางอันจะได้ pdfFonts.pdfMake.vfs
pdfMake.fonts = {
  NotoSansThai: {
    normal: "NotoSansThai-Regular.ttf",
    bold: "NotoSansThai-Regular.ttf",
    italics: "NotoSansThai-Regular.ttf",
    bolditalics: "NotoSansThai-Regular.ttf",
  },
};

// ✅ เปิดใช้ฟอนต์ไทย (วางไฟล์ไว้ที่ public/fonts/NotoSansThai-*.ttf)
const USE_THAI_FONTS = true;

export default function Transactions() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(
          "id, created_at, txn_type, qty, reason, ref_no, " +
            "products(name, sku), warehouses(name), batches(lot_no)"
        )
        .order("id", { ascending: false })
        .limit(500);

      if (error) message.error(error.message);
      else setRows(data || []);
    })();
  }, []);

  const formatDateTH = (iso) =>
    new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

  const handleExportPdf = async () => {
    try {
      // ส่วนหัวตาราง (เป็นไทยทั้งหมด)
      const header = [
        { text: "เวลา", style: "tableHeader" },
        { text: "ประเภท", style: "tableHeader" },
        { text: "SKU", style: "tableHeader" },
        { text: "สินค้า", style: "tableHeader" },
        { text: "คลัง", style: "tableHeader" },
        { text: "Lot", style: "tableHeader" },
        { text: "จำนวน", style: "tableHeader", alignment: "right" },
        { text: "เหตุผล", style: "tableHeader" },
        { text: "อ้างอิง", style: "tableHeader" },
      ];

      const body = [
        header,
        ...rows.map((r) => [
          { text: formatDateTH(r.created_at) },
          { text: r.txn_type },
          { text: r.products?.sku || "" },
          { text: r.products?.name || "" },
          { text: r.warehouses?.name || "" },
          { text: r.batches?.lot_no || "-" },
          { text: (Number(r.qty) || 0).toLocaleString(), alignment: "right" },
          { text: r.reason || "" },
          { text: r.ref_no || "" },
        ]),
      ];

      const nowStr = formatDateTH(Date.now());

      const docDefinition = {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [24, 28, 24, 36],
        defaultStyle: { font: "NotoSansThai", fontSize: 10, lineHeight: 1.5 },
        content: [
          {
            text: "รายการเคลื่อนไหวสต๊อก (Inventory Transactions)",
            style: "title",
          },
          {
            text: `พิมพ์เมื่อ: ${nowStr}`,
            margin: [0, 0, 0, 8],
            color: "#888",
          },
          {
            layout: "lightHorizontalLines",
            table: {
              headerRows: 1,
              widths: [92, 55, 70, "*", 90, 55, 60, 90, 80],
              body,
            },
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
          tableHeader: { bold: true },
        },
        footer: (currentPage, pageCount) => ({
          columns: [
            {
              text: `รวม ${rows.length.toLocaleString()} รายการ`,
              alignment: "left",
              margin: [24, 0, 0, 0],
            },
            {
              text: `หน้า ${currentPage} / ${pageCount}`,
              alignment: "right",
              margin: [0, 0, 24, 0],
            },
          ],
          fontSize: 8,
          color: "#666",
        }),
      };

      const filename = `transactions_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      pdfMake.createPdf(docDefinition).download(filename);
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Export PDF ไม่สำเร็จ");
    }
  };

  return (
    <>
      <Space
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>Transactions</div>
        <Button type="primary" onClick={handleExportPdf}>
          Export PDF
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "เวลา",
            dataIndex: "created_at",
            render: (v) => formatDateTH(v),
          },
          {
            title: "ประเภท",
            dataIndex: "txn_type",
            render: (v) => (
              <Tag color={v === "IN" ? "green" : v === "OUT" ? "red" : "blue"}>
                {v}
              </Tag>
            ),
          },
          { title: "SKU", render: (_, r) => r.products?.sku },
          { title: "สินค้า", render: (_, r) => r.products?.name },
          { title: "คลัง", render: (_, r) => r.warehouses?.name },
          { title: "Lot", render: (_, r) => r.batches?.lot_no || "-" },
          { title: "จำนวน", dataIndex: "qty" },
          { title: "เหตุผล", dataIndex: "reason" },
          { title: "อ้างอิง", dataIndex: "ref_no" },
        ]}
      />
    </>
  );
}
