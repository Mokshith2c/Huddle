# Huddle

Huddle is a full-stack real-time application built with the MERN stack and Socket.io. 

## ✨ Core Features

- **🔐 Secure Authentication**: User registration and secure login utilizing JSON Web Tokens (JWT) and bcrypt.
- **📹 Video & Audio Conferencing**: WebRTC-powered peer-to-peer real-time video and audio meetings.
- **🖥️ Screen Sharing**: Ability to share your screen with other participants in the meeting room seamlessly.
- **🎨 Interactive Whiteboard**: Real-time collaborative whiteboard featuring draw, undo, redo, and clear functionalities synchronized across all clients.
- **💬 Real-time Chat**: In-meeting text chat and messaging powered by Socket.io.
- **🕒 Meeting History**: Dedicated dashboard to keep track of your past meetings and interactions.
- **📁 Media Management**: Built-in support for media uploads and storage using Cloudinary and Multer.
- **⚡ Modern & Responsive UI**: A sleek, responsive frontend built with React and Tailwind CSS.

## 🚀 Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Real-time Communication**: Socket.io Client
- **HTTP Client**: Axios
- **Icons/Animations**: FontAwesome, React Icons

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose)
- **Real-time Communication**: Socket.io
- **Authentication**: JWT, bcrypt
- **File Storage**: Cloudinary (with Multer)
- **Validation**: Joi

## 📁 Project Structure

- `frontend/` - Contains the React Vite application.
- `backend/` - Contains the Node.js Express server.

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mokshith2c/huddle.git
   cd huddle
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file in the `backend` directory (use `.env.example` as a reference) and add your MongoDB URI, Cloudinary credentials, JWT secret, etc.
   - Start the backend server:
     ```bash
     npm run dev
     ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```
   - Create a `.env` file in the `frontend` directory for any frontend environment variables (like the backend API URL).
   - Start the frontend development server:
     ```bash
     npm run dev
     ```

## 📜 Scripts

### Backend
- `npm run dev`: Starts the server in development mode using nodemon.
- `npm start`: Starts the server in production mode.
- `npm run prod`: Starts the server using PM2.

### Frontend
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint for code formatting and error checking.
