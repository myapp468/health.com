//Kiểm tra đăng nhập
const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './login.html';
}

// Check phân quyền
db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
    const roleCheck = (doc.data().role != "admin")
    let delList=document.getElementsByClassName("btn-secondary")
    let changeList=document.getElementsByClassName("btn-danger")
    let editList=document.getElementsByClassName("btn-warning")
    
    if (roleCheck) {
        window.location.href = '../../';
    }
}).catch((error) => {
    console.log("Error getting document:", error);
});

// Lấy danh sách user từ Firestore
const userTable = document.getElementById("userTable");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");

let allUsers = []; // Lưu danh sách user

function loadUsers() {
    db.collection("accounts").onSnapshot((snapshot) => {
        allUsers = []; // Reset danh sách user
        userTable.innerHTML = ""; // Xóa danh sách cũ

        snapshot.forEach((doc) => {
            const user = doc.data();
            user.id = doc.id; // Lưu ID vào user object
            allUsers.push(user);
        });

        filterUsers(); // Cập nhật danh sách ngay sau khi tải
    });
}

function renderUserTable(users) {
    userTable.innerHTML = ""; // Xóa bảng cũ

    users.forEach((user) => {
        const userId = user.id;
        const userRole = user.role || "staff"; // Nếu role bị thiếu, mặc định là nhân viên
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.fullName || "Không có tên"}</td>
            <td>${user.email || "Không có email"}</td>
            <td>
                <select id="role-${userId}" class="form-select">
                    <option value="admin" ${userRole === "admin" ? "selected" : ""}>Admin</option>
                    <option value="doctor" ${userRole === "doctor" ? "selected" : ""}>Bác sĩ</option>
                    <option value="staff" ${userRole === "user" ? "selected" : ""}>Nhân viên</option>
                </select>
            </td>
            <td>${user.locked ? "🔒 Khóa" : "✅ Hoạt động"}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="saveRole('${userId}')">Lưu</button>
                <button class="btn btn-warning btn-sm" onclick="resetPassword('${user.email}')">Reset mật khẩu</button>
                <button class="btn btn-danger btn-sm" onclick="toggleLock('${userId}', ${user.locked})">
                    ${user.locked ? "Mở khóa" : "Khóa"}
                </button>
            </td>
        `;

        userTable.appendChild(row);
    });
}

// Cập nhật vai trò user
function saveRole(userId) {
    const newRole = document.getElementById(`role-${userId}`).value;

    db.collection("accounts").doc(userId).update({ role: newRole })
        .then(() => showToast(`Vai trò đã cập nhật thành ${newRole}!`))
        .catch((error) => {
            console.error("Lỗi khi cập nhật:", error);
            showToast("Lỗi khi cập nhật vai trò!","error");
        });
}

// Reset mật khẩu user
function resetPassword(email) {
    if (!email) {
        showToast("Không tìm thấy email người dùng!","error");
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => showToast(`Email đặt lại mật khẩu đã gửi tới ${email}!`))
        .catch((error) => {
            console.error("Lỗi khi reset mật khẩu:", error);
            showToast("Lỗi khi gửi email. Kiểm tra lại email hoặc quyền admin!","error");
        });
}

// Khóa/Mở khóa tài khoản
function toggleLock(userId, isLocked) {
    db.collection("accounts").doc(userId).update({ locked: !isLocked })
        .then(() => {
            showToast(isLocked ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản!");
            loadUsers(); // Cập nhật giao diện ngay lập tức
        })
        .catch((error) => {
            console.error("Lỗi khi khóa/mở khóa tài khoản:", error);
            showToast("Lỗi khi thay đổi trạng thái tài khoản!","error");
        });
}

// Lọc user theo từ khóa, vai trò, trạng thái
function filterUsers() {
    const searchValue = searchInput.value.toLowerCase();
    const selectedRole = roleFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredUsers = allUsers.filter(user => {
        const matchesSearch =
            user.fullName.toLowerCase().includes(searchValue) ||
            user.email.toLowerCase().includes(searchValue);

        const matchesRole = selectedRole === "all" || user.role === selectedRole;
        const matchesStatus = selectedStatus === "all" ||
            (selectedStatus === "active" && !user.locked) ||
            (selectedStatus === "locked" && user.locked);

        return matchesSearch && matchesRole && matchesStatus;
    });

    renderUserTable(filteredUsers); // Hiển thị danh sách đã lọc
}

// Gắn sự kiện cho bộ lọc
searchInput.addEventListener("input", filterUsers);
roleFilter.addEventListener("change", filterUsers);
statusFilter.addEventListener("change", filterUsers);

// Load user khi trang mở
loadUsers();


// Tạo toast
function showToast(message, type = "success") {
    const toastElement = document.getElementById("toast");
    const toastBody = toastElement.querySelector(".toast-body");

    // Xóa các class màu trước đó
    toastElement.classList.remove("bg-success", "bg-danger", "text-white");

    // Thêm màu phù hợp
    if (type === "error") {
        toastElement.classList.add("bg-danger", "text-white"); // Nền đỏ, chữ trắng
    } else {
        toastElement.classList.add("bg-success", "text-white"); // Nền xanh, chữ trắng
    }

    toastBody.textContent = message;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

