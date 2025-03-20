// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDkYG1rka5KYNGdikmiq3T1iEQnYNFI9YA",
    authDomain: "exammanager-6d15b.firebaseapp.com",
    projectId: "exammanager-6d15b",
    storageBucket: "exammanager-6d15b.firebasestorage.app",
    messagingSenderId: "413386599898",
    appId: "1:413386599898:web:229545e958dd31e633a4e3",
    measurementId: "G-97Q1BQTCZJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Initialize Firebase Authentication and get a reference to the service
const auth = firebase.auth();
// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();
// Initialize Cloud Storage and get a reference to the service
const storage = firebase.storage();


// Tooltip
document.addEventListener("DOMContentLoaded", function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
