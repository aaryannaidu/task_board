import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <h1 className="home-title">Task Board</h1>
            <p className="home-subtitle">
                Manage your projects and teams with elegant simplicity. 
                Everything you need in one powerful dashboard.
            </p>
            <div className="btn-group">
                <button 
                    onClick={() => navigate("/login")}
                    style={{ maxWidth: '160px' }}
                >
                    Login
                </button>
                <button 
                    className="btn-secondary"
                    onClick={() => navigate("/register")}
                    style={{ maxWidth: '160px' }}
                >
                    Register
                </button>
            </div>
        </div>
    );
};

export default Home;