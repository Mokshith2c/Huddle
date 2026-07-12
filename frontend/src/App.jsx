import {BrowserRouter, Route, Routes} from 'react-router-dom'
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from './pages/AuthPage.jsx';
import VideoMeet from './pages/VideoMeetPage.jsx';
import Home from "./pages/Home.jsx"
import History from './pages/History.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Snackbar from './components/Snackbar.jsx';
import "./App.css"

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<LandingPage/>}/>
          <Route path='/auth' element={<AuthPage/>}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/history' element={<History/>}></Route>
          <Route path='/:url' element={<VideoMeet/>}></Route>
        </Routes>
        <Snackbar time={3000} />
      </AuthProvider>
    </BrowserRouter>
  )
}


export default App;