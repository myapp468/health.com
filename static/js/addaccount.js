// //Kiểm tra đăng nhập
// const now = new Date().getTime();
// userSession = JSON.parse(localStorage.getItem("user_session"))
// if (now < userSession?.expiry) {

// }
// else {
//     window.location.href = './login.html';
// }


// document.getElementById("registerForm").addEventListener("submit", function (e) {
//     e.preventDefault();

//     const email = document.getElementById("email").value;
//     const password = document.getElementById("password").value;
//     const fullName = document.getElementById("fullName").value;
//     const role = document.getElementById("role").value;

//     firebase.auth().createUserWithEmailAndPassword(email, password)
//         .then((userCredential) => {
//             const uid = userCredential.user.uid;

//             return firebase.firestore().collection("accounts").doc(uid).set({
//                 fullName: fullName,
//                 email: email,
//                 role: role,
//                 createdAt: firebase.firestore.FieldValue.serverTimestamp()
//             });
//         })
//         .then(() => {
//             alert("Tài khoản đã được tạo thành công!");
//             document.getElementById("registerForm").reset();
//         })
//         .catch((error) => {
//             console.error("Lỗi tạo tài khoản: ", error.message);
//             // alert(error.message);
//             showToast(`Lỗi tạo tài khoản: ${error.message}`);
//         });
// });

// function showToast(message) {
//     const toastElement = document.getElementById("toast");
//     toastElement.querySelector(".toast-body").textContent = message;
//     const toast = new bootstrap.Toast(toastElement);
//     toast.show();
// }\

// document.getElementById("addUserForm").addEventListener("submit", function (e) {
//     e.preventDefault();

//     const fullName = document.getElementById("newFullName").value;
//     const email = document.getElementById("newEmail").value;
//     const password = document.getElementById("newAddPassword").value;
//     const role = document.getElementById("newRole").value;

//     // Tạo tài khoản trên Firebase Authentication
//     firebase.auth().createUserWithEmailAndPassword(email, password)
//         .then((userCredential) => {
//             const userId = userCredential.user.uid;

//             // Lưu thông tin vào Firestore (collection: accounts)
//             return db.collection("accounts").doc(userId).set({
//                 fullName: fullName,
//                 email: email,
//                 role: role,
//                 locked: false,
//                 createdAt: firebase.firestore.FieldValue.serverTimestamp()
//             });
//         })
//         .then(() => {
//             showToast("Tài khoản đã được tạo thành công!");
//             document.getElementById("addUserForm").reset();
//             var modal = bootstrap.Modal.getInstance(document.getElementById("addUserModal"));
//             modal.hide();
//         })
//         .catch((error) => {
//             console.error("Lỗi khi tạo tài khoản:", error);
//             showToast("Lỗi: " + error.message);
//         });
// });
