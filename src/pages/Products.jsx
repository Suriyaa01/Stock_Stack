import { useEffect, useMemo, useState } from "react";
import {
  List,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Image,
  Space,
  Dropdown,
} from "antd";
import { UploadOutlined, PlusOutlined, MoreOutlined } from "@ant-design/icons";
import { supabase } from "../lib/supabase";
import { toast, alertError, confirm } from "../lib/alerts";

const BUCKET = import.meta.env.VITE_PRODUCT_BUCKET || "product-images";

// ทำให้ลิงก์รูปเป็น public url เสมอ + รองรับ blob: preview
const ensurePublicImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("blob:")) return url;
  return url.includes("/storage/v1/object/public/")
    ? url
    : url.replace("/storage/v1/object/", "/storage/v1/object/public/");
};

// placeholder SVG (เผื่อยังไม่มีรูป)
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
      <rect width="100%" height="100%" fill="#f0f2f5"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="20" fill="#bfbfbf">No Image</text>
    </svg>`
  );

const n = (v) => Number(v) || 0;
const nf = (v) => n(v).toLocaleString();

export default function Products() {
  // data
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [balances, setBalances] = useState({}); // { [product_id]: totalQty }

  // create/edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null=create
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");

  // Stock In modal
  const [inOpen, setInOpen] = useState(false);
  const [inForm] = Form.useForm();

  // Adjust modal
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm] = Form.useForm();

  // Image Preview modal
  const [imgViewer, setImgViewer] = useState({
    open: false,
    src: "",
    title: "",
  });
  const openPreview = (src, title = "") =>
    setImgViewer({ open: true, src: src || PLACEHOLDER, title });
  const closePreview = () => setImgViewer({ open: false, src: "", title: "" });

  // โหลด products + inventory_current (รวมยอดต่อ product)
  const loadAll = async () => {
    try {
      const [{ data: prods, error: e1 }, { data: inv, error: e2 }] =
        await Promise.all([
          supabase
            .from("products")
            .select(
              "id, sku, name, unit, price, min_qty, barcode, image_url, category_id, categories(name)"
            )
            .order("id", { ascending: false }),
          supabase.from("inventory_current").select("product_id, qty"),
        ]);

      if (e1) throw e1;
      if (e2 && e2.code !== "42P01") {
        // 42P01 = undefined_table (กรณี view ยังไม่มี) — จะโชว์คงเหลือเป็น 0 ไปก่อน
        console.warn("inventory_current error:", e2);
      }

      // รวมยอด qty ต่อ product_id
      const map = {};
      (inv || []).forEach((r) => {
        map[r.product_id] = (map[r.product_id] || 0) + n(r.qty);
      });

      setRows(prods || []);
      setBalances(map);
    } catch (err) {
      console.error("loadAll error:", err);
      alertError("โหลดข้อมูลไม่สำเร็จ", err.message || "");
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    if (error) alertError("โหลดหมวดหมู่ไม่สำเร็จ", error.message);
    else setCategories(data || []);
  };
  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name")
      .order("name");
    if (error) alertError("โหลดคลังไม่สำเร็จ", error.message);
    else setWarehouses(data || []);
  };

  useEffect(() => {
    fetchCategories();
    fetchWarehouses();
    loadAll();
  }, []);

  // แทรก stock_qty ลงในรายการสำหรับแสดง
  const displayRows = useMemo(
    () => rows.map((p) => ({ ...p, stock_qty: n(balances[p.id]) })),
    [rows, balances]
  );

  // open create
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (imgPreview?.startsWith("blob:")) URL.revokeObjectURL(imgPreview);
    setFile(null);
    setImgPreview("");
    setEditOpen(true);
  };

  // open edit
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      sku: record.sku,
      name: record.name,
      category_id: record.category_id || null,
      unit: record.unit,
      price: record.price,
      min_qty: record.min_qty,
      barcode: record.barcode,
    });
    if (imgPreview?.startsWith("blob:")) URL.revokeObjectURL(imgPreview);
    setFile(null);
    setImgPreview(ensurePublicImageUrl(record.image_url));
    setEditOpen(true);
  };

  // delete (SweetAlert confirm)
  const onDelete = async (record) => {
    const ok = await confirm({
      title: "ยืนยันลบสินค้า?",
      text: `${record.sku} - ${record.name}`,
      confirmText: "ลบ",
      confirmColor: "#ff4d4f",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", record.id);
    if (error) alertError("ลบไม่สำเร็จ", error.message);
    else {
      toast("success", "ลบสินค้าแล้ว");
      loadAll();
    }
  };

  // upload -> public url
  const uploadImageAndGetUrl = async (productId) => {
    if (!file) return null;
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });
    if (upErr) {
      if (/bucket not found/i.test(upErr.message)) {
        throw new Error(
          `ไม่พบ bucket "${BUCKET}" ใน Supabase Storage — สร้าง bucket นี้และตั้ง Public หรือแก้ VITE_PRODUCT_BUCKET ให้ตรง`
        );
      }
      throw upErr;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return pub?.publicUrl || null;
  };

  // save (create/edit)
  const onFinish = async (v) => {
    try {
      if (!editing) {
        const { data: inserted, error } = await supabase
          .from("products")
          .insert({
            sku: v.sku,
            name: v.name,
            category_id: v.category_id || null,
            unit: v.unit || "pcs",
            price: v.price || 0,
            barcode: v.barcode || null,
            min_qty: v.min_qty || 0,
          })
          .select()
          .single();
        if (error) throw error;

        const imgUrl = await uploadImageAndGetUrl(inserted.id);
        if (imgUrl) {
          const { error: updErr } = await supabase
            .from("products")
            .update({ image_url: imgUrl })
            .eq("id", inserted.id);
          if (updErr) throw updErr;
        }
        toast("success", "เพิ่มสินค้าเรียบร้อย");
      } else {
        const { error: updErr1 } = await supabase
          .from("products")
          .update({
            sku: v.sku,
            name: v.name,
            category_id: v.category_id || null,
            unit: v.unit || "pcs",
            price: v.price || 0,
            barcode: v.barcode || null,
            min_qty: v.min_qty || 0,
          })
          .eq("id", editing.id);
        if (updErr1) throw updErr1;

        if (file) {
          const imgUrl = await uploadImageAndGetUrl(editing.id);
          if (imgUrl) {
            const { error: updErr2 } = await supabase
              .from("products")
              .update({ image_url: imgUrl })
              .eq("id", editing.id);
            if (updErr2) throw updErr2;
          }
        }
        toast("success", "บันทึกการแก้ไขแล้ว");
      }

      setEditOpen(false);
      setEditing(null);
      form.resetFields();
      if (imgPreview?.startsWith("blob:")) URL.revokeObjectURL(imgPreview);
      setFile(null);
      setImgPreview("");
      loadAll(); // โหลดทั้ง products + balances ใหม่
    } catch (e) {
      console.error("save product error:", e);
      alertError("บันทึกไม่สำเร็จ", e.message || "");
    }
  };

  // SUBMIT: Stock In (จากปุ่มด้านบน)
  const submitStockIn = async (v) => {
    try {
      await supabase.from("inventory_transactions").insert({
        product_id: v.product_id,
        warehouse_id: v.warehouse_id,
        batch_id: null,
        txn_type: "IN",
        qty: Number(v.qty),
        reason: v.note || null,
        ref_no: v.ref_no || null,
      });
      toast("success", "บันทึก Stock In สำเร็จ");
      setInOpen(false);
      inForm.resetFields();
      loadAll(); // รีโหลด balances ใหม่
    } catch (e) {
      alertError("Stock In ไม่สำเร็จ", e.message || "");
    }
  };

  // SUBMIT: Adjust (จากปุ่มด้านบน)
  const submitAdjust = async (v) => {
    try {
      await supabase.from("inventory_transactions").insert({
        product_id: v.product_id,
        warehouse_id: v.warehouse_id,
        batch_id: null,
        txn_type: "ADJUST",
        qty: Number(v.qty),
        reason: v.direction, // 'add' | 'shrink'
        ref_no: v.note || null,
      });
      toast("success", "ปรับยอดสำเร็จ");
      setAdjOpen(false);
      adjForm.resetFields();
      loadAll(); // รีโหลด balances ใหม่
    } catch (e) {
      alertError("ปรับยอดไม่สำเร็จ", e.message || "");
    }
  };

  // เมนูสำหรับการ์ดแต่ละใบ (Edit/Delete) ใช้ Dropdown
  const cardMenu = (record) => ({
    items: [
      {
        key: "edit",
        label: "Edit",
        onClick: () => openEdit(record),
      },
      {
        key: "delete",
        label: <span style={{ color: "#ff4d4f" }}>Delete</span>,
        onClick: () => onDelete(record),
      },
    ],
  });

  // การ์ดสินค้า (ย้าย Edit/Delete ไปเป็น Dropdown มุมขวาบนรูป) + Preview เมื่อคลิก
  const renderCard = (item) => {
    const imgSrc = ensurePublicImageUrl(item.image_url) || PLACEHOLDER;
    const stockQty = n(item.stock_qty);
    const minQty = n(item.min_qty);
    const low = minQty > 0 && stockQty < minQty;

    const handleOpenPreview = () => openPreview(imgSrc, item.name);

    return (
      <Card
        hoverable
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          cursor: "pointer",
        }}
        onClick={handleOpenPreview} // คลิกที่ตัวการ์ดก็ preview
        cover={
          <div
            style={{
              position: "relative",
              height: 180,
              overflow: "hidden",
              background: "#fafafa",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation(); // กันบับเบิลไปที่ Card
              handleOpenPreview(); // คลิกที่รูปก็ preview
            }}
          >
            {/* ปุ่มเมนูมุมขวาบน */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 2,
              }}
              onClick={(e) => e.stopPropagation()} // กันไม่ให้กดแล้วไปเปิด preview
            >
              <Dropdown menu={cardMenu(item)} trigger={["click"]}>
                <Button
                  shape="circle"
                  size="small"
                  icon={<MoreOutlined />}
                  style={{
                    background: "#ffffff",
                    boxShadow:
                      "0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>

            <img
              src={imgSrc}
              alt={item.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER;
              }}
            />
          </div>
        }
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            {item.name}
          </div>

          <div style={{ fontSize: 13, marginBottom: 6 }}>
            หมวด: {item.categories?.name || "-"}
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            หน่วย: {item.unit || "-"}
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            ราคา: {nf(item.price)}
          </div>

          {/* คงเหลือรวม */}
          <div
            style={{
              marginTop: "auto",
              marginBottom: 4,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            คงเหลือรวม:{" "}
            <span style={{ color: low ? "#ff4d4f" : "#1677ff" }}>
              {nf(stockQty)}
            </span>{" "}
            {item.unit || ""}
          </div>
          {minQty > 0 && (
            <div style={{ fontSize: 12, color: low ? "#ff4d4f" : "#8c8c8c" }}>
              ขั้นต่ำ: {nf(minQty)} {item.unit || ""}{" "}
              {low ? "• ต่ำกว่าขั้นต่ำ" : ""}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const grid = useMemo(
    () => ({ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }),
    []
  );

  return (
    <>
      {/* ปุ่มด้านบน */}
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          เพิ่มสินค้า
        </Button>

        <Button
          style={{ background: "#52c41a", color: "#fff" }}
          onClick={() => {
            inForm.resetFields();
            setInOpen(true);
          }}
        >
          Stock In
        </Button>

        <Button
          style={{ background: "#1677ff", color: "#fff" }}
          onClick={() => {
            adjForm.resetFields();
            setAdjOpen(true);
          }}
        >
          Adjust
        </Button>
      </Space>

      <List
        grid={grid}
        dataSource={displayRows}
        renderItem={(item) => <List.Item>{renderCard(item)}</List.Item>}
      />

      {/* Modal: Create/Edit Product */}
      <Modal
        title={editing ? `ดู/แก้ไขสินค้า: ${editing.name}` : "เพิ่มสินค้า"}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          if (imgPreview?.startsWith("blob:")) URL.revokeObjectURL(imgPreview);
          setFile(null);
          setImgPreview("");
        }}
        onOk={() => form.submit()}
        okText={editing ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
        destroyOnClose
        width={720}
      >
        {/* Preview รูป */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <Image
            src={imgPreview || PLACEHOLDER}
            width={220}
            height={220}
            style={{ objectFit: "cover", borderRadius: 12 }}
            alt="preview"
            onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
            fallback=""
            preview={!!imgPreview && !imgPreview.startsWith("blob:")}
          />
        </div>

        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            name="sku"
            label="รหัสสินค้า (SKU)"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="ชื่อสินค้า"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="category_id" label="หมวดหมู่">
            <Select
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              allowClear
              placeholder="เลือกหมวด"
            />
          </Form.Item>
          <Form.Item name="unit" label="หน่วย (เช่น pcs, box)">
            <Input placeholder="pcs" />
          </Form.Item>
          <Form.Item name="price" label="ราคา">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="min_qty" label="ขั้นต่ำ (เตือนเมื่อคงเหลือต่ำกว่า)">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode (ถ้ามี)">
            <Input />
          </Form.Item>

          <Form.Item label={`รูปสินค้า (bucket: ${BUCKET})`}>
            <Upload
              beforeUpload={(f) => {
                if (imgPreview?.startsWith("blob:"))
                  URL.revokeObjectURL(imgPreview);
                setFile(f);
                setImgPreview(URL.createObjectURL(f));
                return false;
              }}
              maxCount={1}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>เลือกไฟล์</Button>
            </Upload>
            {editing && !file && editing.image_url && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                ใช้รูปเดิมอยู่ (จะอัปเดตเมื่อเลือกไฟล์ใหม่)
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Stock In */}
      <Modal
        title="Stock In"
        open={inOpen}
        onCancel={() => setInOpen(false)}
        onOk={() => inForm.submit()}
        okText="บันทึก"
      >
        <Form layout="vertical" form={inForm} onFinish={submitStockIn}>
          <Form.Item
            name="product_id"
            label="สินค้า"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="เลือกสินค้า"
              optionFilterProp="label"
              options={rows.map((p) => ({
                value: p.id,
                label: `${p.sku || ""} - ${p.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="warehouse_id"
            label="คลัง"
            rules={[{ required: true }]}
          >
            <Select
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code || ""} ${w.name}`.trim(),
              }))}
              showSearch
              optionFilterProp="label"
              placeholder="เลือกคลัง"
            />
          </Form.Item>
          <Form.Item
            name="qty"
            label="จำนวนรับเข้า"
            rules={[{ required: true }]}
          >
            <InputNumber min={0.001} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ref_no" label="เลขอ้างอิง">
            <Input placeholder="Ref no." />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
            <Input placeholder="หมายเหตุ (ถ้ามี)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Adjust */}
      <Modal
        title="ปรับยอด (Adjust)"
        open={adjOpen}
        onCancel={() => setAdjOpen(false)}
        onOk={() => adjForm.submit()}
        okText="บันทึก"
      >
        <Form layout="vertical" form={adjForm} onFinish={submitAdjust}>
          <Form.Item
            name="product_id"
            label="สินค้า"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="เลือกสินค้า"
              optionFilterProp="label"
              options={rows.map((p) => ({
                value: p.id,
                label: `${p.sku || ""} - ${p.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="warehouse_id"
            label="คลัง"
            rules={[{ required: true }]}
          >
            <Select
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code || ""} ${w.name}`.trim(),
              }))}
              showSearch
              optionFilterProp="label"
              placeholder="เลือกคลัง"
            />
          </Form.Item>
          <Form.Item
            name="qty"
            label="จำนวน (บวกเท่านั้น)"
            rules={[{ required: true }]}
          >
            <InputNumber min={0.001} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="direction"
            label="ทิศทาง"
            rules={[{ required: true }]}
            tooltip="add = เพิ่มเข้า, shrink = ตัดออก"
          >
            <Select
              options={[
                { value: "add", label: "เพิ่มเข้า (add)" },
                { value: "shrink", label: "ตัดออก (shrink)" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
            <Input placeholder="ref / หมายเหตุ (ถ้ามี)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Image Preview */}
      <Modal
        open={imgViewer.open}
        footer={null}
        onCancel={closePreview}
        width="auto" // 👈 ปรับเป็น auto
        title={imgViewer.title || "รูปสินค้า"}
        centered
        bodyStyle={{
          display: "flex", // 👈 จัดให้อยู่กลาง
          justifyContent: "center",
          alignItems: "center",
          padding: 0, // ตัด padding ออกให้ modal พอดีกับรูป
        }}
      >
        <img
          src={imgViewer.src || PLACEHOLDER}
          alt={imgViewer.title || "product"}
          style={{
            display: "block",
            maxWidth: "90vw", // 👈 ไม่เกิน 90% ของ viewport กว้าง
            maxHeight: "80vh", // 👈 ไม่เกิน 80% ของ viewport สูง
            objectFit: "contain",
          }}
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
        />
      </Modal>
    </>
  );
}
