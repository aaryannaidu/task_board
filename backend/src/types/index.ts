export type RegisterBody = {
    name: string,
    email: string,
    password: string
};
export type LoginBody = {
    email: string,
    password: string
};
export type CreateProjectBody = {
    name: string,
    description?: string
};
export type CreateTaskBody = {
    title: string,
    columnId: number,
    type: 'STORY' | 'BUG' | 'TASK',
    parentID?: number,
    priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL',
    dueDate?: string,
    description?: string,
    assigneeId?: number
}
export type UpdateTaskBody = {
    title?: string,
    description?: string,
    status?: string,
    prioroity?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL',
    assigneeId?: number,
    dueDate?: string
}
export type MoveTaskBody = {
    columnId: number,
}
export type UpdateMeBody = {
    name?: string;
    avatarUrl?: string;
};