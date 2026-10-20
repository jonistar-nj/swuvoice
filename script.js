

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQwDjVAfhtMJO263oh9NUE71lSlYl7AxTlJiZ99Z74PlU3WesYEeoxST8-tAFaPqs/exec";

const reportForm = document.getElementById("reportForm");
const trackForm = document.getElementById("trackForm");
const message = document.getElementById("message");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const ticketInput = document.getElementById("ticketId");
const trackResult = document.getElementById("trackResult");

let photoData = "";

// สลับระหว่างหน้าแจ้งปัญหาและติดตามสถานะ
document.querySelectorAll(".service-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".service-card").forEach(item => {
      item.classList.toggle("selected", item === card);
    });

    document.querySelectorAll("#report, #track").forEach(section => {
      section.hidden = section.id !== card.dataset.page;
    });
  });
});

// เลือกรูปภาพและแสดงตัวอย่าง
if (photoInput) {
  photoInput.addEventListener("change", () => {
    photoData = "";
    preview.hidden = true;
    clearMessage(message);

    const file = photoInput.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
      showMessage(message, "กรุณาเลือกไฟล์ JPG, PNG, WebP หรือ GIF", "error");
      photoInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(message, "รูปภาพต้องมีขนาดไม่เกิน 5 MB", "error");
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      photoData = reader.result;
      preview.src = photoData;
      preview.hidden = false;
    };

    reader.onerror = () => {
      showMessage(message, "อ่านไฟล์รูปภาพไม่สำเร็จ", "error");
    };

    reader.readAsDataURL(file);
  });
}

// ส่งคำร้อง
if (reportForm) {
  reportForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage(message);

    const form = new FormData(reportForm);

    const payload = {
      name: String(form.get("name") || "").trim(),
      contact: String(form.get("contact") || "").trim(),
      campus: String(form.get("campus") || "").trim(),
      category: String(form.get("category") || "").trim(),
      location: String(form.get("location") || "").trim(),
      priority: String(form.get("priority") || "ปกติ").trim(),
      details: String(form.get("details") || "").trim(),
      photoData
    };

    if (
      !payload.name ||
      !payload.contact ||
      !payload.campus ||
      !payload.category ||
      !payload.location ||
      !payload.details
    ) {
      showMessage(message, "กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังส่งคำร้อง...";

    
try {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload),
    redirect: "follow"
  });

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("คำตอบจาก Apps Script ไม่ใช่ JSON:", responseText);
    throw new Error(
      "Apps Script ส่งคำตอบกลับไม่ถูกต้อง กรุณาตรวจสอบการ Deploy"
    );
  }

  if (!response.ok) {
    throw new Error("การเชื่อมต่อผิดพลาด HTTP " + response.status);
  }

  if (!result.success || !result.ticketId) {
    throw new Error(
      result.message || "บันทึกคำร้องไม่สำเร็จ"
    );
  }

  showMessage(
    message,
    "ส่งคำร้องสำเร็จ กรุณาเก็บเลขที่คำร้องไว้",
    "success"
  );

  const ticket = document.createElement("p");
  ticket.className = "ticket-highlight";
  ticket.textContent = "เลขที่คำร้อง: " + result.ticketId;
  message.appendChild(ticket);

  if (ticketInput) {
    ticketInput.value = result.ticketId;
  }

  reportForm.reset();
  photoData = "";

  if (preview) {
    preview.removeAttribute("src");
    preview.hidden = true;
  }

} catch (error) {
  console.error("ส่งคำร้องไม่สำเร็จ:", error);

  showMessage(
    message,
    "ส่งคำร้องไม่สำเร็จ: " + error.message,
    "error"
  );

} finally {
  submitBtn.disabled = false;
  submitBtn.textContent = "ส่งคำร้อง →";
}
  });
}

// ค้นหาสถานะคำร้อง
if (trackForm) {
  trackForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (trackResult) {
      trackResult.hidden = true;
      trackResult.replaceChildren();
    }
    clearMessage(message);

    const ticketId = ticketInput.value.trim();

    if (!ticketId) {
      showMessage(message, "กรุณากรอกเลขที่คำร้อง", "error");
      return;
    }

    const button = trackForm.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "กำลังค้นหา...";
    }

    try {
      const url = SCRIPT_URL + "?ticketId=" + encodeURIComponent(ticketId);
      const response = await fetch(url, { redirect: "follow" });
      const result = await response.json();

      if (!result.success || !result.ticket) {
        throw new Error(result.message || "ไม่พบคำร้อง");
      }

      renderTicket(result.ticket);

    } catch (error) {
      console.error("ค้นหาคำร้องไม่สำเร็จ:", error);
      showMessage(
        message,
        "ค้นหาสถานะไม่สำเร็จ กรุณาตรวจสอบเลขที่คำร้องและการเชื่อมต่อ",
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "ค้นหาสถานะ";
      }
    }
  });
}

// แสดงรายละเอียดคำร้อง

function renderTicket(ticket) {
  if (!trackResult || !ticket) return;

  // ล้างข้อมูลเก่าก่อนแสดงผลคำร้องใหม่
  trackResult.replaceChildren();

  // หัวข้อคำร้อง
  const title = document.createElement("h3");
  title.textContent = "คำร้อง " + (ticket.ticketId || "-");

  // แสดงสถานะพร้อมกำหนดสี
  const status = document.createElement("p");
  status.className = "status";

  const statusText = String(
    ticket.status || "ไม่ระบุสถานะ"
  ).trim();

  status.textContent = "สถานะ: " + statusText;

  const statusColors = {
    "กำลังดำเนินการ": "status-working",
    "รับเรื่องแล้ว": "status-received",
    "กำลังตรวจสอบ": "status-checking",
    "ดำเนินการเสร็จสิ้น": "status-done",
    "รอดำเนินการ": "status-pending"
  };

  status.classList.add(
    statusColors[statusText] || "status-unknown"
  );

  // รายละเอียดคำร้อง
  const fields = [
    ["วันที่แจ้ง", ticket.createdAt],
    ["ผู้แจ้ง", ticket.name],
    ["วิทยาเขต", ticket.campus],
    ["ประเภทปัญหา", ticket.category],
    ["สถานที่", ticket.location],
    ["ความเร่งด่วน", ticket.priority],
    ["รายละเอียด", ticket.details],
    ["อัปเดตล่าสุด", ticket.updatedAt]
  ];

  // เพิ่มหัวข้อและสถานะลงหน้าเว็บ
  trackResult.append(title, status);

  // เพิ่มรายละเอียดทีละรายการ
  fields.forEach(([label, value]) => {
    const item = document.createElement("p");

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const text = document.createTextNode(
      value == null || value === "" ? "-" : String(value)
    );

    item.append(strong, text);
    trackResult.appendChild(item);
  });

  // แสดงลิงก์รูปภาพประกอบ ถ้ามี
  if (ticket.photoURL) {
    const link = document.createElement("a");

    link.href = ticket.photoURL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "เปิดรูปภาพประกอบ";

    trackResult.appendChild(link);
  }

  // สำคัญ: แสดงผลข้อมูลบนหน้าเว็บ
  trackResult.hidden = false;
  trackResult.style.display = "block";
}

function showMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.className = "message " + type;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.className = "message";
}



