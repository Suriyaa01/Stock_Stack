// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Alert, Skeleton, Button, Space } from 'antd';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [metrics, setMetrics] = useState({ skuCount: 0, totalStock: 0 });

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      // ยืนยันว่ามี session
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error('ยังไม่ได้เข้าสู่ระบบ (no session)');

      // นับจำนวน SKU (head + count)
      const { count: skuCount, error: e1 } = await supabase
        .from('products')
        .select('*', { head: true, count: 'exact' });
      if (e1) throw e1;

      // ดึงคงเหลือทั้งหมดจาก view แล้ว sum ฝั่ง client
      const { data: rows, error: e2 } = await supabase
        .from('inventory_current')
        .select('qty');
      if (e2) throw e2;

      const totalStock = (rows || []).reduce((s, r) => s + Number(r.qty || 0), 0);

      setMetrics({ skuCount: skuCount ?? 0, totalStock });
    } catch (e) {
      console.error('supabase select error:', e);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // โหลดครั้งแรก + รีโหลดเมื่อ auth เปลี่ยน
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <Space style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>Dashboard</Typography.Title>
        <Button onClick={refresh} loading={loading}>Refresh</Button>
      </Space>

      {err && (
        <Alert
          type="error"
          showIcon
          message="ไม่สามารถดึงข้อมูลจาก Supabase"
          description={err}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card title="Total SKUs">
            {loading ? <Skeleton active paragraph={false} /> : metrics.skuCount}
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card title="Total Stock">
            {loading ? <Skeleton active paragraph={false} /> : metrics.totalStock}
          </Card>
        </Col>
      </Row>
    </>
  );
}
