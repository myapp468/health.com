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



function showToast(message) {
    const toastElement = document.getElementById("toast");
    toastElement.querySelector(".toast-body").textContent = message;
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
                            <button class="btn btn-sm btn-primary float-end me-2" onclick="openDotKham('${doc.id}')">Xem</button>`;
            list.appendChild(li);
        });
    });
}



// Thêm đợt khám
function themDotKham() {
    const name = document.getElementById("dotKhamName").value;
    const date = document.getElementById("dotKhamDate").value;
    if (name && date) {
        const newDotKhamRef = db.collection("dot_kham").doc(); // Tạo document với ID tự động
        newDotKhamRef.set({
            name,
            date,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            // Tạo collection "benh_nhan" bên trong document vừa tạo
            newDotKhamRef.collection("benh_nhan").add({
                placeholder: true // Thêm một bản ghi placeholder để đảm bảo collection được tạo
            }).then(() => {
                console.log("Collection benh_nhan đã được tạo bên trong document mới");
            }).catch(error => {
                console.error("Lỗi khi tạo collection benh_nhan:", error);
            });

            showToast("Đã thêm đợt khám thành công!");
            document.getElementById("dotKhamName").value = "";
            document.getElementById("dotKhamDate").value = "";
            var modal = bootstrap.Modal.getInstance(document.getElementById("addModal"));
            modal.hide();
        });
    }
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
    let delList=document.getElementsByClassName("btn-secondary")
    let changeList=document.getElementsByClassName("btn-danger")
    let editList=document.getElementsByClassName("btn-warning")
    
    if (roleCheck) {
        document.getElementById("addRoute").disabled = true
        document.getElementById("addRoute").style.display = "none"
        for (let index = 0; index < delList.length; index++) {
            delList[index].style.display="none";  
        }
        for (let index = 0; index < changeList.length; index++) {
            changeList[index].style.display="none";  
        }
        for (let index = 0; index < editList.length; index++) {
            editList[index].style.display="none";  
        }
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
