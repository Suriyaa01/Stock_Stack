import { message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { supabase } from "../utils/supabaseClient";

const Profile = () => {
  const { authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (e) {
        console.error("Fetch profile error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  const onFinish = async (values) => {
    if (!authUser?.id) return message.error("ยังไม่ได้ล็อกอิน");
    setLoading(true);
    try {
      const payload = { id: authUser.id, ...values };
      const { data, error } = await supabase.from("profiles").upsert(payload).select().single();
      console.log("upsert profile ->", { data, error });
      if (error) throw error;
      message.success("บันทึกโปรไฟล์สำเร็จ");
      setProfile(data);
    } catch (e) {
      console.error("Save profile error:", e);
      message.error(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>โปรไฟล์ของฉัน</h1>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : profile ? (
        <form onFinish={onFinish}>
          <div>
            <label>ชื่อ</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <label>อีเมล</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <button type="submit">บันทึก</button>
        </form>
      ) : (
        <p>ไม่พบข้อมูลโปรไฟล์</p>
      )}
    </div>
  );
};

export default Profile;