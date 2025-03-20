const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './static/page/login.html';
}


// Đăng xuất
const signout = document.querySelector("#sign-out");
function logout(event) {
    firebase.auth().signOut()
        .then(() => {
            // Chuyển hướng người dùng đến trang đăng nhập
            // window.location.href = "login.html"; // Hoặc bất kỳ trang nào bạn muốn
            localStorage.removeItem("user_session")
            window.location.href = './static/page/login.html';
            return
        })
        .catch((error) => {
            alert("Có lỗi xảy ra khi đăng xuất:", error);
        });
}
signout.addEventListener("submit", logout);



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
            li.innerHTML = `<strong>${data.name}</strong> - ${data.date} 
                            <span class="badge bg-${data.active ? 'success' : 'danger'}">${data.active ? 'Hoạt động' : 'Hoàn thành'}</span>
                            <button class="btn btn-sm btn-danger float-end" onclick="xoaDotKham('${doc.id}')" >Xóa</button>
                            <button class="btn btn-sm btn-secondary float-end me-2" onclick="toggleStatus('${doc.id}', ${data.active})" >Đổi trạng thái</button>
                            <button class="btn btn-warning btn-sm float-end me-2" onclick="moModalSuaDotKham('${doc.id}', '${data.name}', '${data.date}')">Sửa</button>
                            <button class="btn btn-sm btn-primary float-end me-2" onclick="openDotKham('${doc.id}')">Tham gia Khám</button>`;
            list.appendChild(li);
        });
    });
}


// Thêm đợt khám
function themDotKham() {
    const name = document.getElementById("dotKhamName").value.trim();
    const dateInput = document.getElementById("dotKhamDate").value;
    console.log(dateInput)

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
                //newDotKhamRef.collection("benh_nhan").add({ placeholder: true });

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

// Check phân quyền
db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
    const roleCheck = (doc.data().role != "admin")
    let delList = document.getElementsByClassName("btn-secondary")
    let changeList = document.getElementsByClassName("btn-danger")
    let editList = document.getElementsByClassName("btn-warning")

    if (roleCheck) {
        document.getElementById("addRoute").disabled = true
        document.getElementById("addRoute").style.display = "none"
        document.getElementById("adminRole").classList.add("d-none")
        for (let index = 0; index < delList.length; index++) {
            delList[index].style.display = "none";
        }
        for (let index = 0; index < changeList.length; index++) {
            changeList[index].style.display = "none";
        }
        for (let index = 0; index < editList.length; index++) {
            editList[index].style.display = "none";
        }
    }
    else {
        document.getElementById("adminRole").classList.add("d-block")
    }
}).catch((error) => {
    console.log("Error getting document:", error);
});

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
