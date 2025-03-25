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
var posNameMain=""
if (localStorage.getItem("pos_name")=="Cs") {
    posNameMain="Chăm sóc khách hàng"
}
else if (localStorage.getItem("pos_name")=="Doctor") {
    posNameMain="Bác sĩ"
}
else if (localStorage.getItem("pos_name")=="Admin") {
    posNameMain="Admin"
}
else if (localStorage.getItem("pos_name")=="Nurse") {
    posNameMain="Điều dưỡng"
}
else if (localStorage.getItem("pos_name")=="Community") {
    posNameMain="Phát triển cộng đồng"
}
document.getElementById("userName").innerHTML = capitalizeFirstLetter(localStorage.getItem("local_name"))+"<br>"+posNameMain

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
    document.getElementById("menuList").innerHTML+=roleCheck ? `
        <li class="nav-item">
            <a class="nav-link" href="./checkaccount.html" id="adminRole">Phân quyền</a>
        </li>`:""
}).catch((error) => {
    console.log("Error getting document:", error);
});

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
function loadDotKham() {
    const list = document.getElementById("dotKhamList");
    list.innerHTML = "";

    db.collection("dot_kham").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement("li");
            li.classList.add("list-group-item");
            li.setAttribute("id", `dot_${doc.id}`);
            let saveIdExam=doc.id
            db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
                let roleConfirm = (doc.data().role=="admin" || doc.data().role=="community")
                li.innerHTML = roleConfirm ? `<strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Xóa" class="btn btn-sm btn-danger float-end" onclick="xoaDotKham('${saveIdExam}')" ><i class="fa-solid fa-trash"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Chuyển trạng thái" class="btn btn-sm btn-secondary float-end me-1" onclick="toggleStatus('${saveIdExam}', ${data.active})" ><i class="fa-solid fa-square-check"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Sửa" class="btn btn-warning btn-sm float-end me-1" onclick="moModalSuaDotKham('${saveIdExam}', '${data.name}', '${data.date}')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button data-bs-toggle="tooltip" data-bs-placement="top" title="Khám" class="btn btn-sm btn-primary float-end me-1" onclick="openDotKham('${saveIdExam}')"><i class="fa-solid fa-notes-medical"></i></button>`: `<strong class="examName" onclick="openDotKham('${saveIdExam}')">${data.name}</strong> - ${data.date} 
                <span class="badge bg-${data.active ? 'success' : 'danger'} float-start me-1">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span><button data-bs-toggle="tooltip" data-bs-placement="top" title="Khám" class="btn btn-sm btn-primary float-end me-1" onclick="openDotKham('${saveIdExam}')"><i class="fa-solid fa-notes-medical"></i></button>`
                list.appendChild(li);
            })
            
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
        .where("date", "==", formattedDate) // So sánh với định dạng mới
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                showToast("Đợt khám với tên và ngày này đã tồn tại. Vui lòng chọn tên/ngày khác!");
                return;
            }

            // Nếu không trùng, tiếp tục tạo đợt khám mới
            const newDotKhamRef = db.collection("dot_kham").doc();
            newDotKhamRef.set({
                name,
                date: formattedDate, // Lưu ngày đã định dạng
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // Tạo collection "benh_nhan" bên trong document vừa tạo
                showToast("Đã thêm đợt khám thành công!");
                document.getElementById("dotKhamName").value = "";
                document.getElementById("dotKhamDate").value = "";

                var modal = bootstrap.Modal.getInstance(document.getElementById("addModal"));
                modal.hide();
            });
        })
        .catch(error => {
            console.error("Lỗi khi kiểm tra trùng tên và ngày:", error);
            showToast("Có lỗi xảy ra, vui lòng thử lại!");
        });
}


function toggleStatus(id, currentStatus) {
    db.collection("dot_kham").doc(id).update({ active: !currentStatus });
}

function xoaDotKham(id) {
    if (confirm("Bạn có chắc muốn xóa đợt khám này không?")) {
        db.collection("dot_kham").doc(id).delete().then(() => {
            showToast("Đã xóa đợt khám thành công!");
        });
    }
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

