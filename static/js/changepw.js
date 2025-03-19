//Kiểm tra đăng nhập
const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './login.html';
}

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('error-message');

    errorMessage.classList.add('d-none');
    errorMessage.innerText = "";

    if (newPassword !== confirmPassword) {
        errorMessage.classList.remove('d-none');
        errorMessage.innerText = "Mật khẩu mới và xác nhận mật khẩu không khớp.";
        return;
    }
    
    if (newPassword.length < 6) {
        errorMessage.classList.remove('d-none');
        errorMessage.innerText = "Mật khẩu mới phải có ít nhất 6 ký tự.";
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert("Hết phiên đăng nhập, vui lòng đăng nhập lại!");
        window.location.href = 'login.html';
        return;
    }
    
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    
    try {
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        alert("Đổi mật khẩu thành công, vui lòng đăng nhập lại!");
        localStorage.removeItem("user_session")
        auth.signOut().then(() => window.location.href = 'login.html');
    } catch (error) {
        errorMessage.classList.remove('d-none');
        errorMessage.innerText = "Lỗi: " + error.message;
    }
});

// Tạo toast
function showToast(message) {
    const toastElement = document.getElementById("toast");
    toastElement.querySelector(".toast-body").textContent = message;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}
