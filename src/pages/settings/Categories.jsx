import { useEffect, useState } from 'react';
import { Table, Button, Drawer, Form, Input, message } from 'antd';
import { supabase } from '../../lib/supabase';

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    const { data, error } = await supabase.from('categories').select('id, name').order('name');
    if (error) {
      console.error('select categories error:', error);
      message.error(error.message);
    } else setRows(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const onFinish = async (v) => {
    const { data, error, status } = await supabase
      .from('categories')
      .insert({ name: v.name })
      .select()
      .single();

    if (error) {
      console.error('insert categories error:', { status, error });
      message.error(`เพิ่มหมวดไม่สำเร็จ (${status}): ${error.message}`);
      return;
    }
    message.success('เพิ่มหมวดสำเร็จ');
    setOpen(false);
    form.resetFields();
    fetchData();
  };

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>+ เพิ่มหมวดหมู่</Button>
      <Table style={{ marginTop: 16 }} rowKey="id" dataSource={rows}
        columns={[{ title: 'ชื่อหมวดหมู่', dataIndex: 'name' }]} />

      <Drawer title="เพิ่มหมวดหมู่" open={open} onClose={() => setOpen(false)} width={420}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item name="name" label="ชื่อหมวดหมู่" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit">บันทึก</Button>
        </Form>
      </Drawer>
    </>
  );
}
