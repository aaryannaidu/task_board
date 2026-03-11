import * as bcrypt from 'bcrypt';


export const hashPwd = async (password: string): Promise<string> => {
    const saltRounds = 12;
    const hashedPwd = await bcrypt.hash(password, saltRounds);
    return hashedPwd;
};

export const checkPwd = async (password: string, hashedPwd: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPwd);
};