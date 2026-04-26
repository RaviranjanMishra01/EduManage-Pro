# 📚 EduManage-Pro

**EduManage-Pro** is a modern, feature-rich School Management System built with **Node.js**, **Express**, **MongoDB**, and **EJS**. It streamlines school operations including teacher/student management, attendance tracking, exam handling, and real-time communication.
---

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><b>🏠 Home Page</b></td>
      <td align="center"><b>📊 School Dashboard</b></td>
      <td align="center"><b>👨‍🏫 Teacher Dashboard</b></td>
    </tr>
    <tr>
      <td><img src="public/images/EduManage.png" alt="Home Page"></td>
      <td><img src="public/images/SchoolDashboard.png" alt="School Dashboard"></td>
      <td><img src="public/images/TeaccherDash.png" alt="Teacher Dashboard"></td>
    </tr>

  </table>
</div>

---

## 🚀 Features

### 👨‍🏫 Teacher Module
- Teacher login with JWT authentication
- Class-wise student management
- Take attendance (daily)
- Suspend/Unsuspend students
- Update student email
- Assign subject teachers
- View assigned classes & subjects

### 🏫 School Admin Module
- School registration & login
- Create/Edit/Delete teachers
- Create/Edit/Delete classes
- Manage students across classes
- Teacher suspension management
- Dashboard with real-time stats (total teachers, classes, attendance %)
- Pagination & search in tables

### 🔐 Authentication & Security
- Secure password hashing (bcrypt)
- JWT-based authentication
- Role-based access (School Admin / Teacher)
- Forgot password with email OTP (Nodemailer + Mailtrap)
- Session management

### 📧 Email Services
- OTP sending for password reset
- Welcome emails for new schools
- Contact form email notifications

### 🎨 Frontend
- Responsive EJS templates
- Premium glassmorphism UI
- Mobile-friendly sidebar & navbar
- Interactive tables with actions
- Real-time form validation

---

## 🗂️ Project Structure
```js
    EduManage-Pro/
├── mail/
│ ├── emails.js 
│ ├── emailTemp.js 
│ └── user.mailtrap.js
├── middleware/
│ ├── schoolAuth.js
│ └── teacherAuth.js 
├── models/
│ ├── attendance.js
│ ├── class.js
│ ├── contact.js
│ ├── createSchool.js
│ ├── student.js
│ ├── subject.js
│ └── teacher.js
├── public/
│ ├── scripts/ 
│ ├── styles/ 
│ └── uploads/ 
├── routes/
│ ├── handleSchool.js 
│ └── handleTeacher.js 
├── utils/
│ └── helpers.js 
├── views/
│ ├── partials/
│ │ ├── footer.ejs
│ │ ├── nav.ejs
│ │ └── teacherNavbar.ejs
│ ├── teachers/
│ │ ├── assignSubjectTeachers.ejs
│ │ ├── attendance.ejs
│ │ ├── createStudent.ejs
│ │ ├── createTeacher.ejs
│ │ ├── login.ejs
│ │ └── teacherDashboard.ejs
│ ├── about.ejs
│ ├── contact.ejs
│ ├── createSchool.ejs
│ ├── editClass.ejs
│ ├── home.ejs
│ ├── index.ejs
│ ├── schoolDashboard.ejs
│ ├── schoolForgotOtp.ejs
│ ├── schoolForgotPassword.ejs
│ ├── schoolLogin.ejs
│ ├── schoolResetPassword.ejs
│ ├── showId.ejs
│ ├── teacherForgotRequest.ejs
│ ├── teacherResetPassword.ejs
│ ├── teacherVerifyOtp.ejs
│ └── verifySchoolOtp.ejs
├── .env
├── .gitignore
├── connect_mongoDB.js # MongoDB connection
├── index.js # Main entry point
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Node.js, Express.js                 |
| Database    | MongoDB, Mongoose ODM               |
| Templating  | EJS (Embedded JavaScript)           |
| Authentication | JWT, bcrypt, express-session     |
| Email       | Nodemailer + Mailtrap (dev)         |
| Frontend    | HTML5, CSS3, JavaScript, Font Awesome |
| Styling     | Custom CSS (Glassmorphism, Flex/Grid) |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- Mailtrap account (for email testing)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/RaviranjanMishra01/EduManage-Pro
   cd EduManage-Pro
2. **Install dependencies**

    npm install
4. **Run the application**
    
    npm start
    ### or for development with auto-reload
    npm run dev

5. **Open browser**

    http://localhost:5000

# 👨‍💻 Author
**Your Name**  
GitHub: [@RaviranjanMishra01](https://github.com/your-username)