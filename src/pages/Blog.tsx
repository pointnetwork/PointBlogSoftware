import {useEffect, useMemo, useState} from 'react';
import Header from '../components/Header';
import {useLocation, useNavigate} from 'react-router-dom';
import {useAppContext} from '../context/AppContext';
import PageLayout from '../layouts/PageLayout';
import {OutlinedButton, PrimaryButton} from '../components/Button';
import utils from '../context/utils';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RecommendIcon from '@mui/icons-material/Recommend';
import {Comment} from '../@types/types';
import {BlogContract, RoutesEnum} from '../@types/enums';
import {Blog, BlogContractData} from '../@types/interfaces';

const BlogPage = () => {
    const {search} = useLocation();
    const query = useMemo(() => new URLSearchParams(search), [search]);
    const isDeleted = query.get('deleted');
    const id = query.get('id');
    
    const {
        blogs,
        getDataFromStorage,
        visitorAddress,
        isOwner,
        getDeletedBlogs
    } = useAppContext();

    const [original, setOriginal] = useState<(Omit<Blog, 'coverImage'> & BlogContractData) | undefined>();
    const [selectedHash, setSelectedHash] = useState<string>('');
    const [displayData, setDisplayData] = useState<
        (Omit<Blog, 'coverImage'> & BlogContractData & {coverImage?: File}) | undefined
    >();
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [numLikes, setNumLikes] = useState<number>(0);
    const [editCommentId, setEditCommentId] = useState<string>('');
    const [commentText, setCommentText] = useState<string>('');
    const [comments, setComments] = useState<Comment[]>([]);

    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            if (id && !blogs.loading) {
                const _blogs = isDeleted ? await getDeletedBlogs() : blogs.data;
                const requiredBlog = _blogs.find((blog) => blog.storageHash === id);
                if (requiredBlog) {
                    const _displayData = {...requiredBlog, coverImage: undefined};
                    if (requiredBlog?.coverImage) {
                        const blob = await window.point.storage.getFile({id: requiredBlog.coverImage});
                        _displayData.coverImage = blob;
                    }
                    setOriginal(_displayData);
                    setDisplayData(_displayData);
                    setSelectedHash(id);
                }
            }
        })();
    }, [id, blogs]);

    const getLikesForBlogPost = async () => {
        const {data}: { data: string[] } = await window.point.contract.call({
            contract: BlogContract.name,
            method: BlogContract.getLikesForBlogPost,
            params: [original?.id]
        });
        if (data.map((i) => i.toLowerCase()).includes(visitorAddress.toLowerCase())) {setIsLiked(true);} else setIsLiked(false);
        setNumLikes(data.length);
    };

    const getCommentsForBlogPost = async () => {
        const {data}: { data: Comment[] } = await window.point.contract.call({
            contract: BlogContract.name,
            method: BlogContract.getCommentsForBlogPost,
            params: [original?.id]
        });
        const _comments = await Promise.all(
            data.map(async ([_id, commentedBy, comment]) => {
                const identity = await utils.getIdentityFromAddress(commentedBy);
                return [_id, commentedBy, comment, identity] as Comment;
            })
        );
        setComments(_comments.reverse());
    };

    useEffect(() => {
        if (original) {
            getLikesForBlogPost();
            getCommentsForBlogPost();
        }
    }, [original]);

    useEffect(() => {
        if (editCommentId) {
            setCommentText(comments.find(([_id]) => _id === editCommentId)![2]);
        } else {
            setCommentText('');
        }
    }, [editCommentId]);

    const handleIterationSelect = async (hash: string) => {
        const requiredBlog = await getDataFromStorage(hash);
        setDisplayData(requiredBlog);
        setSelectedHash(hash);
    };

    const handleSelectLatest = () => {
        setDisplayData(original);
        setSelectedHash(id!);
    };

    const handleLike = async () => {
        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.likeBlogPost,
            params: [original?.id]
        });
        getLikesForBlogPost();
    };

    const handleUnlike = async () => {
        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.unlikeBlogPost,
            params: [original?.id]
        });
        getLikesForBlogPost();
    };

    const handleAddComment = async () => {
        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.addCommentToBlogPost,
            params: [original?.id, commentText]
        });
        setCommentText('');
        getCommentsForBlogPost();
    };

    const handleDeleteComment = async (commentId: string) => {
        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.deleteCommentForBlogPost,
            params: [original?.id, commentId]
        });
        setCommentText('');
        getCommentsForBlogPost();
    };

    const handleEditComment = async () => {
        await window.point.contract.send({
            contract: BlogContract.name,
            method: BlogContract.editCommentForBlogPost,
            params: [original?.id, editCommentId, commentText]
        });
        setEditCommentId('');
        getCommentsForBlogPost();
    };

    return (
        <PageLayout>
            <Header />
            <main className='pb-4 pt-8 mx-auto' style={{maxWidth: '720px'}}>
                {original ? (
                    <>
                        <div
                            className='flex items-center opacity-40 cursor-pointer hover:opacity-90 transition-all -ml-4'
                            onClick={() => navigate(-1)}
                        >
                            <ArrowBackIosNewIcon />
                            <span>Back</span>
                        </div>

                        {isOwner && original?.previousStorageHashes ? (
                            <div className='flex items-center my-4 justify-end'>
                                <p className='text-gray-500 mr-4'>Iterations:</p>
                                <p
                                    className={`py-1 px-3 text-sm ${
                                        selectedHash === id
                                            ? 'text-white bg-indigo-500'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    } cursor-pointer rounded mr-2`}
                                    onClick={handleSelectLatest}
                                >
                                    {original?.previousStorageHashes.length! + 1}
                                </p>
                                {original?.previousStorageHashes.map((hash, i) => (
                                    <p
                                        className={`py-1 px-3 text-sm ${
                                            selectedHash === hash
                                                ? 'text-white bg-indigo-500'
                                                : 'bg-gray-100 hover:bg-gray-200'
                                        } cursor-pointer rounded mr-2`}
                                        key={hash}
                                        onClick={() => handleIterationSelect(hash)}
                                    >
                                        {original?.previousStorageHashes.length - i}
                                    </p>
                                ))}
                            </div>
                        ) : null}

                        <h1 className='text-3xl font-bold mt-4'>{displayData?.title}</h1>
                        <p className='mt-1 text-sm text-gray-600 mb-6'>
                            {displayData?.publishDate}
                        </p>
                        {displayData?.coverImage ? (
                            <div className='bg-gray-200 mb-6'>
                                <img
                                    src={URL.createObjectURL(displayData.coverImage)}
                                    alt='cover of the blog'
                                    className='w-full h-full rounded'
                                />
                            </div>
                        ) : null}
                        <div
                            // TODO: Safegaurd against XSS
                            dangerouslySetInnerHTML={{__html: `${displayData?.content}`}}
                        ></div>

                        {!isDeleted ? (
                            <div
                                className={`fixed rounded-full bottom-2 border left-1/2 -translate-x-1/2 p-2 pr-4 shadow-xl z-30 flex items-center cursor-pointer transition-all ${
                                    isLiked
                                        ? 'bg-indigo-500 text-white hover:bg-indigo-700'
                                        : 'bg-white text-gray-500 hover:text-gray-900'
                                }`}
                                onClick={isLiked ? handleUnlike : handleLike}
                                title={isLiked ? 'Unlike' : 'Like'}
                            >
                                <RecommendIcon />
                                <p className='ml-1'>{numLikes} Likes</p>
                            </div>
                        ) : null}

                        <div className='mt-8 mb-12 relative'>
                            <div className='sticky bg-white top-14 py-3'>
                                <h6 className='text-lg font-bold'>
                                    {isDeleted ? 'Comments' : 'Leave a comment'}
                                </h6>
                                {!isDeleted ? (
                                    <>
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className='w-full p-1 rounded border border-gray-400 my-2'
                                        ></textarea>
                                        {editCommentId ? (
                                            <div className='flex items-center space-x-2'>
                                                <PrimaryButton onClick={handleEditComment}>
                          Update Comment
                                                </PrimaryButton>
                                                <OutlinedButton onClick={() => setEditCommentId('')}>
                          Cancel
                                                </OutlinedButton>
                                            </div>
                                        ) : (
                                            <PrimaryButton onClick={handleAddComment}>
                        Add Comment
                                            </PrimaryButton>
                                        )}
                                    </>
                                ) : null}
                            </div>
                            {comments.length ? (
                                comments.map(([id, commentedBy, comment, identity]) => (
                                    <div
                                        className={`py-3 mb-3 border-b border-gray-300 ${
                                            editCommentId === id ? 'bg-indigo-100' : ''
                                        }`}
                                        key={id}
                                    >
                                        <div className='flex justify-between'>
                                            <p className='font-bold'>{identity}</p>
                                            {commentedBy.toLowerCase() ===
                      visitorAddress.toLowerCase() ? (
                                                        <div className='flex items-center space-x-2'>
                                                            <EditOutlinedIcon
                                                                onClick={() => setEditCommentId(id)}
                                                                className='text-gray-400 hover:text-gray-900 cursor-pointer transition-all'
                                                                sx={{width: 18, height: 18}}
                                                            />
                                                            <DeleteOutlineOutlinedIcon
                                                                onClick={() => handleDeleteComment(id)}
                                                                className='text-red-400 hover:text-red-500 cursor-pointer transition-all'
                                                                sx={{width: 18, height: 18}}
                                                            />
                                                        </div>
                                                    ) : null}
                                        </div>
                                        <p className='text-sm'>{comment}</p>
                                    </div>
                                ))
                            ) : (
                                <p className='mt-1'>No comments yet.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className='flex flex-col items-center mt-10'>
                        <h1 className='text-3xl font-bold mb-4'>
              This blog post does not exist anymore.
                        </h1>
                        <PrimaryButton onClick={() => navigate(RoutesEnum.home)}>
              Go to Home
                        </PrimaryButton>
                    </div>
                )}
            </main>
        </PageLayout>
    );
};

export default BlogPage;
