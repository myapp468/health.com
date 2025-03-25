// Đăng xuất
const signout = document.querySelector("#sign-out");
const nameCurrent=localStorage.getItem("local_name")
// Hàm logout
function logout(event) {
    firebase.auth().signOut()
        .then(() => {
            // Chuyển hướng người dùng đến trang đăng nhập
            // window.location.href = "login.html"; // Hoặc bất kỳ trang nào bạn muốn
            localStorage.removeItem("user_session")
            localStorage.removeItem("local_name")
            localStorage.removeItem("pos_name")
            window.location.href = './login.html';
            return
        })
        .catch((error) => {
            alert("Có lỗi xảy ra khi đăng xuất:", error);
        });
}
signout.addEventListener("submit", logout);
// Hiển thị tên

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
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
