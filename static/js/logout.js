// Đăng xuất
const signout = document.querySelector("#sign-out");
const nameCurrent=localStorage.getItem("local_name")

function logout(event) {
    firebase.auth().signOut()
        .then(() => {
            // Chuyển hướng người dùng đến trang đăng nhập
            // window.location.href = "login.html"; // Hoặc bất kỳ trang nào bạn muốn
            localStorage.removeItem("user_session")
            localStorage.removeItem("local_name")
            window.location.href = './login.html';
            return
        })
        .catch((error) => {
            alert("Có lỗi xảy ra khi đăng xuất:", error);
        });
}
signout.addEventListener("submit", logout);

document.getElementById("userName").innerHTML=localStorage.getItem("local_name")