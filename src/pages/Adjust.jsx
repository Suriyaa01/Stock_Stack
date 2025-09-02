import { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

export default function Adjust() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('products').select('id, name, sku').order('name');
      const { data: w } = await supabase.from('warehouses').select('id, name').order('name');
      setProducts(p || []); setWarehouses(w || []);
    })();
  }, []);

  const onFinish = async (v) => {
    const { error } = await supabase.from('inventory_transactions').insert({
      product_id: v.product_id,
      warehouse_id: v.warehouse_id,
      txn_type: 'ADJUST',
      qty: Math.abs(v.qty),
      reason: v.reason
    });
    if (error) message.error(error.message);
    else { message.success('บันทึกการปรับยอดแล้ว'); form.resetFields(); }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth:600 }}>
      <Form.Item name="product_id" label="สินค้า" rules={[{required:true}]}>
        <Select showSearch options={products.map(p=>({ value:p.id, label:`${p.sku} - ${p.name}` }))}/>
      </Form.Item>
      <Form.Item name="warehouse_id" label="คลัง" rules={[{required:true}]}>
        <Select options={warehouses.map(w=>({ value:w.id, label:w.name }))}/>
      </Form.Item>
      <Form.Item name="qty" label="จำนวน (เป็นค่าบวก)" rules={[{required:true}]}>
        <InputNumber style={{width:'100%'}} min={0.001}/>
      </Form.Item>
      <Form.Item name="reason" label="ทิศทาง/เหตุผล" rules={[{required:true}]}
        tooltip="เลือก add = เพิ่มเข้า, shrink = ตัดออก">
        <Select options={[
          { value:'add', label:'เพิ่มเข้า (add)' },
          { value:'shrink', label:'ตัดออก (shrink)' },
        ]}/>
      </Form.Item>
      <Button type="primary" htmlType="submit">บันทึก</Button>
    </Form>
  );
}
