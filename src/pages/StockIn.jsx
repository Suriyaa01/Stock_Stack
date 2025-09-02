import { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, message, Input, DatePicker } from 'antd';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function StockIn() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('products').select('id, name, sku').eq('is_active', true).order('name');
      const { data: w } = await supabase.from('warehouses').select('id, name').order('name');
      setProducts(p || []); setWarehouses(w || []);
    })();
  }, []);

  const onProductChange = async (product_id) => {
    const { data } = await supabase.from('batches').select('id, lot_no, expiry_date').eq('product_id', product_id).order('expiry_date');
    setBatches(data || []);
  };

  const onFinish = async (v) => {
    let batch_id = v.batch_id || null;
    if (!batch_id && v.lot_no) {
      const { data: b, error } = await supabase.from('batches').insert({
        product_id: v.product_id,
        lot_no: v.lot_no,
        expiry_date: v.expiry_date ? dayjs(v.expiry_date).format('YYYY-MM-DD') : null
      }).select().single();
      if (error) return message.error(error.message);
      batch_id = b.id;
    }

    const { error } = await supabase.from('inventory_transactions').insert({
      product_id: v.product_id,
      warehouse_id: v.warehouse_id,
      batch_id,
      txn_type: 'IN',
      qty: v.qty,
      unit_cost: v.unit_cost || null,
      reason: v.reason || 'stock_in',
      ref_no: v.ref_no || null
    });

    if (error) message.error(error.message);
    else { message.success('บันทึกรับเข้าแล้ว'); form.resetFields(); setBatches([]); }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth:600 }}>
      <Form.Item name="product_id" label="สินค้า" rules={[{required:true}]}>
        <Select showSearch options={products.map(p=>({ value:p.id, label:`${p.sku} - ${p.name}` }))} onChange={onProductChange}/>
      </Form.Item>
      <Form.Item name="warehouse_id" label="คลัง" rules={[{required:true}]}>
        <Select options={warehouses.map(w=>({ value:w.id, label:w.name }))}/>
      </Form.Item>
      <Form.Item label="Batch / Lot"><Input placeholder="กรอก Lot ใหม่ (ถ้ามี)" name="lot_no" onChange={e=>form.setFieldValue('lot_no', e.target.value)}/></Form.Item>
      <Form.Item name="batch_id" label="หรือเลือก Lot ที่มีอยู่">
        <Select allowClear options={batches.map(b=>({value:b.id, label:`${b.lot_no} (exp: ${b.expiry_date||'-'})`}))}/>
      </Form.Item>
      <Form.Item name="expiry_date" label="วันหมดอายุ (ถ้าสร้าง Lot ใหม่)"><DatePicker style={{width:'100%'}}/></Form.Item>
      <Form.Item name="qty" label="จำนวน" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0.001}/></Form.Item>
      <Form.Item name="unit_cost" label="ต้นทุน/หน่วย"><InputNumber style={{width:'100%'}}/></Form.Item>
      <Form.Item name="ref_no" label="เลขที่อ้างอิง"><Input /></Form.Item>
      <Form.Item name="reason" label="เหตุผล"><Input placeholder="stock_in"/></Form.Item>
      <Button type="primary" htmlType="submit">บันทึกรับเข้า</Button>
    </Form>
  );
}
