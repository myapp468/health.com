const inpEmail = document.querySelector("#inp-email");
const inpPwd = document.querySelector("#inp-pwd");
const loginForm = document.querySelector("#login-form");
let userSession = JSON.parse(localStorage.getItem('user_session'));

const now = new Date().getTime();

if (now < userSession?.expiry) {
    window.location.href = "../../";
}

const toastTrigger = document.getElementById('liveToastBtn')
const toastLiveExample = document.getElementById('liveToast')
const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample)

function handleLogin(event) {
    event.preventDefault(); // Ngăn chặn hành vi mặc định của form

    let email = inpEmail.value;
    let password = inpPwd.value;

    // Kiểm tra các trường có trống không
    if (!email || !password) {
        document.querySelector('.toast-body').innerHTML = "Vui lòng điền đủ các trường"
        document.querySelector('.error-toast').innerHTML = "Error"
        toastBootstrap.show()
        return;
    }

    // Đăng nhập với Firebase Auth
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            var user = userCredential.user;
            // Kiểm tra trạng thái khóa trong Firestore
            db.collection("accounts").doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.locked) {
                        // Nếu tài khoản bị khóa, đăng xuất và thông báo
                        firebase.auth().signOut().then(() => {
                            document.getElementById("error-login").innerText = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
                        });
                        return;
                    }

                    // Nếu không bị khóa, thiết lập phiên
                    const userSession = {
                        user: {
                            uid: user.uid,
                            email: user.email,
                            role: userData.role || "staff"
                        },
                        expiry: new Date().getTime() + 2 * 60 * 60 * 1000 // 2 tiếng
                    };
                    localStorage.setItem('user_session', JSON.stringify(userSession));
                    localStorage.setItem('local_name', userData.fullName);
                    localStorage.setItem('pos_name', capitalizeFirstLetter(userData.role));
                    window.location.href = "../../"; // Chuyển hướng
                } else {
                    document.getElementById("error-login").innerText = "Không tìm thấy tài khoản trong hệ thống.";
                    firebase.auth().signOut();
                }
            });
        })
        .catch((error) => {
            document.getElementById("error-login").innerText = "Tài khoản hoặc mật khẩu không đúng";
        });
}

loginForm.addEventListener("submit", handleLogin);

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}