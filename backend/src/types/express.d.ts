declare global{
    namespace Express{
        interface Request{
            user?:{
                userID:number;
                globalRole:string
            };
        }
    }
}
export{};