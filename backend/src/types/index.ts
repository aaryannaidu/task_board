export type RegisterBody={
    name:string,
    email:string,
    password:string
};
export type LoginBody={
    email:string,
    password:string
};
export type CreateProjectBody={
    name:string,
    description?:string
};
export type CreateTaskBody={
    title:string,
    columnId:number,
    type:'STORY' | 'BUG' | 'TASK',
    parenID?:number,
    prioroity:'HIGH' | 'MEDIUM' | 'LOW'|'CRITICAL',
    dueDate?:string
}
export type UpdateTaskBody={
    title?:string,
    description?:string,
    status?:string,
    prioroity?:'HIGH' | 'MEDIUM' | 'LOW'|'CRITICAL',
    assigneeId?:number,
    dueDate?:string
}
export type MoveTaskBody={
    columnId:number,
}