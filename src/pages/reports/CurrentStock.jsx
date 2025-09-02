import { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { supabase } from '../../lib/supabase';

export default function CurrentStock() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('inventory_current')
        .select('product_id, warehouse_id, batch_id, qty, products(name, sku), warehouses(name), batches(lot_no, expiry_date)')
        .order('product_id', { ascending:true });
      if (error) message.error(error.message);
      else setRows(data || []);
    })();
  }, []);

  return (
    <Table rowKey={(r)=>`${r.product_id}-${r.warehouse_id}-${r.batch_id||'none'}`}
      dataSource={rows}
      columns={[
        { title:'SKU', render:(_,r)=>r.products?.sku },
        { title:'สินค้า', render:(_,r)=>r.products?.name },
        { title:'คลัง', render:(_,r)=>r.warehouses?.name },
        { title:'Lot', render:(_,r)=>r.batches?.lot_no || '-' },
        { title:'Expiry', render:(_,r)=>r.batches?.expiry_date || '-' },
        { title:'คงเหลือ', dataIndex:'qty' },
      ]}
    />
  );
}
