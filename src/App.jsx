import { useMemo, useState } from "react";
import {
  Layout,
  Menu,
  ConfigProvider,
  App as AntdApp,
  Grid,
  Drawer,
  Button,
} from "antd";
import { MenuOutlined } from "@ant-design/icons";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";

import AuthGate from "./components/AuthGate.jsx";
import Login from "./pages/auth/Login.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Products from "./pages/Products.jsx";
import StockIn from "./pages/StockIn.jsx";
import StockOut from "./pages/StockOut.jsx";
import Adjust from "./pages/Adjust.jsx";
import Transactions from "./pages/Transactions.jsx";
import CurrentStock from "./pages/reports/CurrentStock.jsx";
import Movements from "./pages/reports/Movements.jsx";
import Warehouses from "./pages/settings/Warehouses.jsx";
import Categories from "./pages/settings/Categories.jsx";

const { Header, Sider, Content } = Layout;

// แยก component ย่อยเพื่อเข้าถึง useLocation ได้สะดวก
function AppShell() {
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const items = useMemo(
    () => [
      { key: "dashboard", label: <Link to="/dashboard">Dashboard</Link> },
      { key: "products", label: <Link to="/products">Products</Link> },
      // { key: "stock-in", label: <Link to="/stock-in">Stock In</Link> },
      // { key: "stock-out", label: <Link to="/stock-out">Stock Out</Link> },
      // { key: "adjust", label: <Link to="/adjust">Adjust</Link> },
      { key: "txn", label: <Link to="/transactions">Transactions</Link> },
      // {
      //   key: "r1",
      //   label: <Link to="/reports/current-stock">Current Stock</Link>,
      // },
      { key: "r2", label: <Link to="/reports/movements">Movements</Link> },
      // { key: "w", label: <Link to="/settings/warehouses">Warehouses</Link> },
      // { key: "c", label: <Link to="/settings/categories">Categories</Link> },
    ],
    []
  );

  // map path -> key ให้เมนูไฮไลต์ถูกหน้า
  const selectedKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/products")) return "products";
    if (p.startsWith("/stock-in")) return "stock-in";
    if (p.startsWith("/stock-out")) return "stock-out";
    if (p.startsWith("/adjust")) return "adjust";
    if (p.startsWith("/transactions")) return "txn";
    if (p.startsWith("/reports/current-stock")) return "r1";
    if (p.startsWith("/reports/movements")) return "r2";
    if (p.startsWith("/settings/warehouses")) return "w";
    if (p.startsWith("/settings/categories")) return "c";
    return "dashboard";
  }, [location.pathname]);

  // Sider ปกติสำหรับ >= lg
  const DesktopSider = (
    <Sider
      width={232}
      collapsible
      breakpoint="lg"
      collapsedWidth={80}
      style={{ position: "sticky", top: 0, height: "100dvh" }}
    >
      <div
        className="logo"
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          color: "#fff",
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        Inventory
      </div>
      <Menu
        theme="dark"
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
      />
    </Sider>
  );

  // เมนูใน Drawer สำหรับ < lg
  const MobileDrawer = (
    <Drawer
      title="Inventory"
      placement="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      bodyStyle={{ padding: 0 }}
    >
      <Menu
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
        onClick={() => setDrawerOpen(false)} // ปิดเมื่อเลือกเมนู
      />
    </Drawer>
  );

  return (
    <Layout style={{ minHeight: "100dvh" }}>
      {/* แสดง Sider เมื่อจอกว้าง (>= lg) */}
      {screens.lg && DesktopSider}

      <Layout>
        <Header
          className="site-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#fff",
            paddingInline: screens.lg ? 24 : 12,
            position: "sticky",
            top: 0,
            zIndex: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {/* ปุ่มเมนูเฉพาะมือถือ/แท็บเล็ต */}
          {!screens.lg && (
            <>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
              {MobileDrawer}
            </>
          )}
          <div style={{ fontWeight: 700 }}>
            {/* ชื่อหน้าแบบง่าย ๆ ตามเมนูที่เลือก */}
            {{
              dashboard: "Dashboard",
              products: "Products",
              "stock-in": "Stock In",
              "stock-out": "Stock Out",
              adjust: "Adjust",
              txn: "Transactions",
              r1: "Current Stock",
              r2: "Movements",
              w: "Warehouses",
              c: "Categories",
            }[selectedKey] || "Inventory"}
          </div>
        </Header>

        <Content
          className="site-content"
          style={{
            padding: screens.lg ? 24 : 12,
          }}
        >
          <div
            className="app-container"
            style={{
              margin: "0 auto",
              width: "100%",
              maxWidth: screens.xl ? 1280 : screens.lg ? 1100 : "100%",
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route element={<AuthGate />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                {/* <Route path="/stock-in" element={<StockIn />} />
                <Route path="/stock-out" element={<StockOut />} />
                <Route path="/adjust" element={<Adjust />} /> */}
                <Route path="/transactions" element={<Transactions />} />
                {/* <Route
                  path="/reports/current-stock"
                  element={<CurrentStock />}
                /> */}
                <Route path="/reports/movements" element={<Movements />} />
                {/* <Route path="/settings/warehouses" element={<Warehouses />} />
                <Route path="/settings/categories" element={<Categories />} /> */}
              </Route>
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: { colorBgLayout: "#f5f7fb", borderRadius: 12 },
        components: {
          Layout: { headerBg: "#fff" },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
