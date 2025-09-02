import { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, message, Input } from 'antd';
import { supabase } from '../lib/supabase';

export default function StockOut() {
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
    const { error } = await supabase.from('inventory_transactions').insert({
      product_id: v.product_id,
      warehouse_id: v.warehouse_id,
      batch_id: v.batch_id || null,
      txn_type: 'OUT',
      qty: v.qty,
      reason: v.reason || 'sale',
      ref_no: v.ref_no || null
    });
    if (error) message.error(error.message);
    else { message.success('บันทึกเบิก/ขายออกแล้ว'); form.resetFields(); setBatches([]); }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth:600 }}>
      <Form.Item name="product_id" label="สินค้า" rules={[{required:true}]}>
        <Select showSearch options={products.map(p=>({ value:p.id, label:`${p.sku} - ${p.name}` }))} onChange={onProductChange}/>
      </Form.Item>
      <Form.Item name="warehouse_id" label="คลัง" rules={[{required:true}]}>
        <Select options={warehouses.map(w=>({ value:w.id, label:w.name }))}/>
      </Form.Item>
      <Form.Item name="batch_id" label="Lot (ถ้ามี)">
        <Select allowClear options={batches.map(b=>({ value:b.id, label:`${b.lot_no} (exp: ${b.expiry_date||'-'})` }))}/>
      </Form.Item>
      <Form.Item name="qty" label="จำนวน" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0.001}/></Form.Item>
      <Form.Item name="ref_no" label="เลขที่อ้างอิง"><Input /></Form.Item>
      <Form.Item name="reason" label="เหตุผล"><Input placeholder="sale / usage"/></Form.Item>
      <Button type="primary" htmlType="submit">บันทึก</Button>
    </Form>
  );
}
