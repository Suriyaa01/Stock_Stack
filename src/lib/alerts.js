// src/lib/alerts.js
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Toast มุมขวาบน
export const toast = (icon = "success", title = "") =>
  MySwal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
  });

// กล่องแจ้งเตือนทั่วไป
export const alertSuccess = (title = "สำเร็จ", text = "") =>
  MySwal.fire({ icon: "success", title, text });

export const alertError = (title = "เกิดข้อผิดพลาด", text = "") =>
  MySwal.fire({ icon: "error", title, text });

// กล่องยืนยัน (แทน Popconfirm)
export const confirm = async ({
  title = "ยืนยันการทำรายการ?",
  text = "",
  confirmText = "ตกลง",
  cancelText = "ยกเลิก",
  confirmColor = "#1677ff", // ฟ้าโทน AntD
}) => {
  const res = await MySwal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    reverseButtons: true,
    focusCancel: true,
  });
  return res.isConfirmed;
};
