import { useEffect, useState } from 'react';
import { Table, DatePicker, Button, Space, message, Select } from 'antd';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

export default function Movements() {
  const [rows, setRows] = useState([]);
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [type, setType] = useState();

  const fetchData = async () => {
    let q = supabase.from('inventory_transactions')
      .select('id, created_at, txn_type, qty, reason, products(name, sku), warehouses(name)')
      .gte('created_at', range[0].toISOString())
      .lte('created_at', range[1].endOf('day').toISOString())
      .order('id', { ascending:false });
    if (type) q = q.eq('txn_type', type);
    const { data, error } = await q;
    if (error) message.error(error.message); else setRows(data || []);
  };

  useEffect(()=>{ fetchData(); /* eslint-disable-next-line */ },[]);

  return (
    <>
      <Space style={{ marginBottom:16 }}>
        <DatePicker.RangePicker value={range} onChange={v=>setRange(v)} />
        <Select placeholder="ทุกประเภท" allowClear value={type} onChange={setType}
          options={[{value:'IN',label:'IN'},{value:'OUT',label:'OUT'},{value:'ADJUST',label:'ADJUST'}]} />
        <Button type="primary" onClick={fetchData}>ค้นหา</Button>
      </Space>
      <Table rowKey="id" dataSource={rows} pagination={{ pageSize:20 }}
        columns={[
          { title:'เวลา', dataIndex:'created_at' },
          { title:'ประเภท', dataIndex:'txn_type' },
          { title:'SKU', render:(_,r)=>r.products?.sku },
          { title:'สินค้า', render:(_,r)=>r.products?.name },
          { title:'คลัง', render:(_,r)=>r.warehouses?.name },
          { title:'จำนวน', dataIndex:'qty' },
          { title:'เหตุผล', dataIndex:'reason' },
        ]}
      />
    </>
  );
}
