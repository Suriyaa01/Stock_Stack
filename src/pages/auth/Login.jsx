import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const nav = useNavigate();

  const onFinish = async (v) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: v.email, password: v.password });
        if (error) throw error;
        message.success('Sign up สำเร็จ (ถ้าเปิด email confirm ต้องกดยืนยันในอีเมล)');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
        if (error) throw error;
        message.success('เข้าสู่ระบบสำเร็จ');
        nav('/dashboard', { replace: true });
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isSignUp ? 'Sign up' : 'Sign in'} style={{ maxWidth: 380, margin: '64px auto' }}>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password /></Form.Item>
        <Button block type="primary" htmlType="submit" loading={loading}>
          {isSignUp ? 'Create account' : 'Login'}
        </Button>
      </Form>
      <Space direction="vertical" size={8} style={{ marginTop: 16 }}>
        <Typography.Link onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'มีบัญชีแล้ว? กลับไป Sign in' : 'ยังไม่มีบัญชี? Sign up'}
        </Typography.Link>
      </Space>
    </Card>
  );
}
