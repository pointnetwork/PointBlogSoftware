import React, {useEffect, useState} from 'react';
import {OutlinedButton, PrimaryButton} from '../components/Button';
import {useNavigate} from 'react-router-dom';
import {useAppContext} from '../context/AppContext';
import PageLayout from '../layouts/PageLayout';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import {BlogContract, RoutesEnum} from '../@types/enums';
import {UserInfo} from '../@types/interfaces';

const CreateProfile = ({edit}: { edit?: boolean }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [avatar, setAvatar] = useState<string | ArrayBuffer | null>(null);
    const [about, setAbout] = useState<string>('');

    const navigate = useNavigate();
    const {ownerAddress, userInfo, getUserInfo, getAllBlogs} = useAppContext();

    useEffect(() => {
        if (edit) {
            setLoading(true);
            setAvatar(userInfo.data.avatar);
            setAbout(userInfo.data.about);
            setLoading(false);
        }
    }, [edit, userInfo]);

    const handleFileInput = (e: any) => {
        const reader = new FileReader();
        reader.onload = function (e: any) {
            setAvatar(e.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    const handleFinish = async () => {
        setLoading(true);
        const form = JSON.stringify({
            avatar,
            about
        } as UserInfo);
        const file = new File([form], 'user.json', {type: 'application/json'});

        const formData = new FormData();
        formData.append('file', file);
        // Upload the File to arweave
        const res = await window.point.storage.postFile(formData);
        setLoading(false);

        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.saveUserInfo,
            params: [ownerAddress, res.data]
        });
        getUserInfo();
        getAllBlogs();
        navigate(RoutesEnum.admin);
    };

    return (
        <PageLayout>
            <header className='py-3 sticky top-0 bg-white shadow z-10'>
                <div className='mx-auto' style={{maxWidth: '1000px'}}>
                    {/* Logo will go here */}
                    <span className='font-medium'>BlogSoftware</span>
                </div>
            </header>
            <main className='mt-8 mx-auto' style={{maxWidth: '1000px'}}>
                <h1 className='text-3xl font-bold mb-6'>
                    {edit ? 'Update' : 'Complete'} Your Profile
                </h1>
                <div className='flex mb-8'>
                    <div className='mr-24'>
                        <h3 className='font-bold text-lg mb-4'>Upload a Profile Image</h3>
                        {!avatar ? (
                            <div className='h-56 w-56 p-8 rounded-full border-2 bg-gray-100 border-gray-300 flex flex-col items-center justify-center relative overflow-hidden'>
                                <ImageOutlinedIcon
                                    sx={{height: 42, width: 42}}
                                    className='text-gray-500'
                                />
                                <p className='text-gray-500 mt-1'>Click to Upload</p>
                                <input
                                    type='file'
                                    accept='image/*'
                                    title='Upload a file'
                                    className='absolute w-full h-full opacity-0 cursor-pointer'
                                    onChange={handleFileInput}
                                />
                            </div>
                        ) : (
                            <img
                                src={avatar.toString()}
                                className='w-56 h-56 rounded-full border-2 border-gray-200 object-cover'
                                alt='profile'
                            />
                        )}
                        {avatar ? (
                            <p className='relative text-sm mt-4 transition-all text-gray-500 hover:text-black'>
                                <span className='absolute left-1/2 -translate-x-1/2 cursor-pointer underline'>
                  Change
                                </span>
                                <input
                                    type='file'
                                    title='Upload a file'
                                    className='absolute w-20 h-6 opacity-0 left-1/2 -translate-x-1/2 cursor-pointer'
                                    onChange={handleFileInput}
                                />
                            </p>
                        ) : null}
                    </div>
                    <div className='flex-1'>
                        <h3 className='font-bold text-lg mb-2'>A Little About You</h3>
                        <textarea
                            className='w-full h-40 p-2 border-2 border-gray-200 resize-none rounded'
                            value={about}
                            onChange={(e) =>
                                e.target.value.length <= 1000 && setAbout(e.target.value)
                            }
                            maxLength={1000}
                        ></textarea>
                        <div className='flex justify-end mb-3 text-sm text-gray-500 m-1'>
                            {about.length}/1000
                        </div>
                        <div className='flex space-x-3'>
                            <PrimaryButton
                                disabled={!avatar || !about || loading}
                                onClick={handleFinish}
                            >
                                {loading ? 'Please Wait' : edit ? 'Update Profile' : 'Finish'}
                            </PrimaryButton>
                            {edit ? (
                                <OutlinedButton onClick={() => navigate(-1)}>
                  Cancel
                                </OutlinedButton>
                            ) : null}
                        </div>
                    </div>
                </div>
            </main>
        </PageLayout>
    );
};

export default CreateProfile;
