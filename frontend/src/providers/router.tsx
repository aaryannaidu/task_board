import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../routes/home";
import Register from "../routes/register";
import Login from "../routes/login";
import Dashboard from "../routes/dashboard";
import ProjectPage from "../routes/project";
import BoardPage from "../routes/board";

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
        element: <div>Profile Page (TODO)</div>,
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
]);

export default router;