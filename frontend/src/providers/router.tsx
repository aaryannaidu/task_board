import { createBrowserRouter } from "react-router-dom";
import Home from "../routes/home";
import Register from "../routes/register";
import Login from "../routes/login";
import Dashboard from "../routes/dashboard";
import ProjectPage from "../routes/project";
import BoardPage from "../routes/board";
import TaskPage from "../routes/task";
import UserProfile from "../routes/user";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/profile",
        element: <UserProfile />,
    },
    {
        path: "/dashboard",
        element: <Dashboard />,
    },
    {
        path: "/projects/:id",
        element: <ProjectPage />,
    },
    {
        path: "/projects/:id/boards/:boardId",
        element: <BoardPage />,
    },
    {
        path: "/projects/:id/tasks/:taskId",
        element: <TaskPage />,
    },
]);

export default router;