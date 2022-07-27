import React from 'react';
import './ProfileCard.css';
import Cover from '../../img/cover.jpg';
import Profile from '../../img/profileImg.jpg';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
const ProfileCard = ({ location }) => {
	const { user } = useSelector(state => state.authReducer.authData);

	return (
		<div className='ProfileCard'>
			<div className='ProfileImages'>
				<img
					src={'/images/defaultCover.jpg'}
					alt='CoverImage'
				/>
				<img
					src={'/images/defaultProfile.png'}
					alt='ProfileImage'
				/>
			</div>
			<div className='ProfileName'>
				<span>
					{user.firstname} {user.lastname}
				</span>
				<span>
					{/* {user.worksAt ? user.worksAt : 'Write about yourself'} */}
					{/* TODO Add techs here */}
				</span>
			</div>

			<div className='followStatus'>
				<hr />
				<div>
					<div className='follow'>
						<span>{user.followers.length}</span>
						<span>FromUsers</span>
					</div>
					<div className='vl'></div>
					<div className='follow'>
						<span>{user.following.length}</span>
						<span>Following</span>
					</div>
				</div>
				<hr />
			</div>

			{location === 'profilePage' ? (
				''
			) : (
				<span>
					<Link
						to={`/profile/${user._id}`}
						style={{ textDecoration: 'none', color: 'inherit' }}
					>
						My Profile
					</Link>
				</span>
			)}
		</div>
	);
};

export default ProfileCard;
