import { useEffect, useState } from 'react';
import { Table, Button, Drawer, Form, Input, message } from 'antd';
import { supabase } from '../../lib/supabase';

export default function Warehouses() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    const { data, error } = await supabase.from('warehouses').select('id, code, name').order('id', { ascending:false });
    if (error) message.error(error.message); else setRows(data || []);
  };
  useEffect(()=>{ fetchData(); },[]);

  const onFinish = async (v) => {
    const { error } = await supabase.from('warehouses').insert({ code:v.code, name:v.name });
    if (error) message.error(error.message);
    else { message.success('เพิ่มคลังแล้ว'); setOpen(false); form.resetFields(); fetchData(); }
  };

  return (
    <>
      <Button type="primary" onClick={()=>setOpen(true)}>+ เพิ่มคลัง</Button>
      <Table style={{ marginTop:16 }} rowKey="id" dataSource={rows}
        columns={[{title:'Code', dataIndex:'code'},{title:'Name', dataIndex:'name'}]} />
      <Drawer title="เพิ่มคลัง" open={open} onClose={()=>setOpen(false)} width={420}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item name="code" label="รหัสคลัง" rules={[{required:true}]}><Input/></Form.Item>
          <Form.Item name="name" label="ชื่อคลัง" rules={[{required:true}]}><Input/></Form.Item>
          <Button type="primary" htmlType="submit">บันทึก</Button>
        </Form>
      </Drawer>
    </>
  );
}
