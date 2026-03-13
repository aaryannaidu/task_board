import bcrypt from 'bcrypt';

export async function HashPassword (password:string):Promise<string>{
    return await bcrypt.hash(password,10);
}
export async function ComparePassword (password:string,hash:string):Promise<boolean>{
    return await bcrypt.compare(password,hash);
}