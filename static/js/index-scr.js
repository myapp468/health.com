const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './static/page/login.html';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Hiển thị tên
var posNameMain = ""
if (localStorage.getItem("pos_name") == "Cs") {
    posNameMain = "Chăm sóc khách hàng"
}
else if (localStorage.getItem("pos_name") == "Doctor") {
    posNameMain = "Bác sĩ"
}
else if (localStorage.getItem("pos_name") == "Admin") {
    posNameMain = "Admin"
}
else if (localStorage.getItem("pos_name") == "Nurse") {
    posNameMain = "Điều dưỡng"
}
else if (localStorage.getItem("pos_name") == "Community") {
    posNameMain = "Phát triển cộng đồng"
}
document.getElementById("userName").innerHTML = capitalizeFirstLetter(localStorage.getItem("local_name")) + "<br>" + posNameMain

// Đăng xuất
const signout = document.querySelector("#sign-out");
function logout(event) {
    firebase.auth().signOut()
        .then(() => {
            // Chuyển hướng người dùng đến trang đăng nhập
            // window.location.href = "login.html"; // Hoặc bất kỳ trang nào bạn muốn
            localStorage.removeItem("user_session")
            localStorage.removeItem("local_name")
            localStorage.removeItem("pos_name")
            window.location.href = './static/page/login.html';
            return
        })
        .catch((error) => {
            alert("Có lỗi xảy ra khi đăng xuất:", error);
        });
}
signout.addEventListener("submit", logout);


// Check thêm menu phân quyền
db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
    const roleCheck = (doc.data().role == "admin")
    localStorage.setItem("roleKey", doc.data().role)
    document.getElementById("menuList").innerHTML += roleCheck ? `
        <li class="nav-item">
            <a class="nav-link" href="./static/page/checkaccount.html" id="adminRole">Phân quyền</a>
        </li>`: ""
    document.getElementById("examSession").innerHTML += roleCheck ? `<button class="btn btn-primary my-3" data-bs-toggle="modal" data-bs-target="#addModal" id="addRoute">Thêm Đợt
            Khám</button>`: ""
}).catch((error) => {
    console.log("Error getting document:", error);
});
const roleKey = localStorage.getItem("roleKey")
localStorage.removeItem("roleKey")


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

// Load đợt khám
document.querySelectorAll('input[name="dotKhamFilter"]').forEach(radio => {
    radio.addEventListener('change', loadDotKham);
});

function loadDotKham() {
    const filterValue = document.querySelector('input[name="dotKhamFilter"]:checked').value;
    const list = document.getElementById("dotKhamList");
    list.innerHTML = "";

    db.collection("dot_kham").orderBy("createdAt", "desc").get().then(snapshot => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const saveIdExam = doc.id;

            if (filterValue === "active" && !data.active) return;
            if (filterValue === "completed" && data.active) return;

            const li = document.createElement("li");
            li.classList.add("list-group-item");
            li.setAttribute("id", `dot_${doc.id}`);

            db.collection("accounts").doc(userSession.user.uid).get().then((accountDoc) => {
                let roleConfirm = (accountDoc.data().role == "admin" || accountDoc.data().role == "community");
                li.innerHTML = roleConfirm ? `<table border="0" class="w-100"><tbody><tr><td onclick="openDotKham('${saveIdExam}')" style="width:90%"><strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span></td><td><button data-bs-toggle="tooltip" data-bs-placement="top" title="Xóa" class="btn btn-sm btn-danger float-end ${accountDoc.data().role == "admin" ? '' : 'd-none'}" onclick="xoaDotKham('${saveIdExam}')" ><i class="fa-solid fa-trash"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Chuyển trạng thái" class="btn btn-sm btn-secondary float-end me-1" onclick="toggleStatus('${saveIdExam}', ${data.active})" ><i class="fa-solid fa-square-check"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Sửa" class="btn btn-warning btn-sm float-end me-1" onclick="moModalSuaDotKham('${saveIdExam}', '${data.name}', '${data.date}')"><i class="fa-solid fa-pen-to-square"></i></button></td></tr></tbody></table>`
                    : `<table border="0" class="w-100"><tbody><tr><td onclick="openDotKham('${saveIdExam}')" style="width:90%"><strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span></td></tr></tbody></table>`;
                list.appendChild(li);
            });
        });
    });
}

// Thêm đợt khám
function themDotKham() {
    const name = document.getElementById("dotKhamName").value.trim();
    const dateInput = document.getElementById("dotKhamDate").value;

    if (!name || !dateInput) {
        showToast("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    // Chuyển đổi định dạng ngày từ YYYY-MM-DD → DD/MM/YYYY
    const dateParts = dateInput.split("-");
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Kiểm tra trùng tên & ngày trước khi thêm
    db.collection("dot_kham")
        .where("name", "==", name)
        .where("date", "==", formattedDate)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                showToast("Đợt khám với tên và ngày này đã tồn tại. Vui lòng chọn tên/ngày khác!");
                return;
            }

            // Nếu không trùng, thêm vào Firestore
            db.collection("dot_kham").add({
                name,
                date: formattedDate,
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then((docRef) => {
                showToast("Đã thêm đợt khám thành công!");
                document.getElementById("dotKhamName").value = "";
                document.getElementById("dotKhamDate").value = "";

                // Ẩn modal
                var modal = bootstrap.Modal.getInstance(document.getElementById("addModal"));
                modal.hide();

                // 🛠 Thêm trực tiếp vào danh sách
                db.collection("dot_kham").doc(docRef.id).get().then(doc => {
                    if (doc.exists) {
                        chenDotKhamVaoDanhSach(doc);
                    }
                });
            });
        })
        .catch(error => {
            console.error("Lỗi khi kiểm tra trùng tên và ngày:", error);
            showToast("Có lỗi xảy ra, vui lòng thử lại!");
        });
}

// Chèn vào không reload
function chenDotKhamVaoDanhSach(doc) {
    const data = doc.data();
    const saveIdExam = doc.id;
    const filterValue = document.querySelector('input[name="dotKhamFilter"]:checked').value;

    // Nếu bộ lọc không phù hợp với trạng thái của đợt khám, không chèn vào danh sách
    if ((filterValue === "active" && !data.active) || (filterValue === "completed" && data.active)) {
        return;
    }

    const list = document.getElementById("dotKhamList");

    const li = document.createElement("li");
    li.classList.add("list-group-item");
    li.setAttribute("id", `dot_${doc.id}`);

    db.collection("accounts").doc(userSession.user.uid).get().then((accountDoc) => {
        let roleConfirm = (accountDoc.data().role == "admin" || accountDoc.data().role == "community");
        li.innerHTML = roleConfirm ? `<table border="0" class="w-100"><tbody><tr><td onclick="openDotKham('${saveIdExam}')" style="width:90%"><strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span></td><td><button data-bs-toggle="tooltip" data-bs-placement="top" title="Xóa" class="btn btn-sm btn-danger float-end ${accountDoc.data().role == "admin" ? '' : 'd-none'}" onclick="xoaDotKham('${saveIdExam}')" ><i class="fa-solid fa-trash"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Chuyển trạng thái" class="btn btn-sm btn-secondary float-end me-1" onclick="toggleStatus('${saveIdExam}', ${data.active})" ><i class="fa-solid fa-square-check"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Sửa" class="btn btn-warning btn-sm float-end me-1" onclick="moModalSuaDotKham('${saveIdExam}', '${data.name}', '${data.date}')"><i class="fa-solid fa-pen-to-square"></i></button></td></tr></tbody></table>`
                    : `<table border="0" class="w-100"><tbody><tr><td onclick="openDotKham('${saveIdExam}')" style="width:90%"><strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span></td></tr></tbody></table>`;
        list.prepend(li); // Chèn lên đầu danh sách
    });
}

// Cập nhật trạng thái
function toggleStatus(examId, currentStatus) {
    const newStatus = !currentStatus;
    db.collection("dot_kham").doc(examId).update({
        active: newStatus
    }).then(() => {
        showToast("Đã cập nhật trạng thái!");
        // Cập nhật trực tiếp UI
        capNhatTrangThaiUI(examId, newStatus);
    }).catch(error => {
        showToast(`Lỗi: ${error}`, "error");
    });
}

// Cập nhật lại UI hàm cập nhật
function capNhatTrangThaiUI(examId, newStatus) {
    const filterValue = document.querySelector('input[name="dotKhamFilter"]:checked').value;
    const listItem = document.getElementById(`dot_${examId}`);

    if (!listItem) return; // Nếu không tìm thấy item, thoát luôn

    // Nếu trạng thái không khớp bộ lọc, xóa khỏi danh sách
    if ((filterValue === "active" && !newStatus) || (filterValue === "completed" && newStatus)) {
        listItem.remove();
        return;
    }

    // Cập nhật trạng thái trên UI
    const statusBadge = listItem.querySelector(".badge");
    statusBadge.classList.remove("bg-success", "bg-danger");
    statusBadge.classList.add(newStatus ? "bg-success" : "bg-danger");
    statusBadge.textContent = newStatus ? "Hoạt động" : "Hoàn thành";

    // Cập nhật nút toggle trạng thái
    const toggleButton = listItem.querySelector(".btn-secondary");
    toggleButton.setAttribute("onclick", `toggleStatus('${examId}', ${newStatus})`);
}



let deletingExamId = null; // Lưu ID đợt khám cần xóa

// Xóa đợt khám
function xoaDotKham(id) {
    deletingExamId = id; // Gán ID đợt khám cần xóa
    const deleteModal = new bootstrap.Modal(document.getElementById("confirmDeleteModal"));
    deleteModal.show(); // Hiển thị modal
}

// Xử lý khi nhấn nút xác nhận xóa
document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
    if (deletingExamId) {
        const tempId = deletingExamId
        db.collection("dot_kham").doc(deletingExamId).delete().then(() => {
            showToast("Đã xóa đợt khám thành công!");
            // xoaUpdateUI(deletingExamId); // Cập nhật danh sách
            const listItem = document.getElementById(`dot_${tempId}`);
            if (!listItem) return; // Nếu không tìm thấy item, thoát luôn
            listItem.remove()

        }).catch(error => {
            showToast(`Lỗi: ${error}`, "error");
        });
    }
    deletingExamId = null;
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById("confirmDeleteModal"));
    deleteModal.hide(); // Ẩn modal
});

// Cập nhật ui xóa
function xoaUpdateUI(delItem) {
    console.log(delItem)
}

function openDotKham(id) {
    window.location.href = `./static/page/dotkham.html?id=${id}`;
}
loadDotKham();


// Sửa đợt khám
function moModalSuaDotKham(id, name, date) {
    document.getElementById("editDotKhamId").value = id;
    document.getElementById("editDotKhamName").value = name;
    document.getElementById("editDotKhamDate").value = date;

    var modal = new bootstrap.Modal(document.getElementById("editModal"));
    modal.show();
}

function capNhatDotKham() {
    const id = document.getElementById("editDotKhamId").value;
    const name = document.getElementById("editDotKhamName").value;
    const date = document.getElementById("editDotKhamDate").value;

    if (id && name && date) {
        db.collection("dot_kham").doc(id).update({
            name: name,
            date: date
        }).then(() => {
            showToast("Cập nhật đợt khám thành công!");
            var modal = bootstrap.Modal.getInstance(document.getElementById("editModal"));
            modal.hide();
        }).catch(error => {
            console.error("Lỗi cập nhật đợt khám:", error);
            alert("Lỗi khi cập nhật đợt khám!");
        });
    }
}

// Lọc ngày hiện tại
document.addEventListener("DOMContentLoaded", function () {
    // Lấy ngày hôm nay
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0 nên phải +1
    const dd = String(today.getDate()).padStart(2, "0");

    const minDate = `${yyyy}-${mm}-${dd}`; // Định dạng YYYY-MM-DD

    // Gán giá trị min cho input date
    document.getElementById("dotKhamDate").setAttribute("min", minDate);
});

