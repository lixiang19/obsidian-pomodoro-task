import * as React from "react";
import { useState } from "react";
import { Notice } from "obsidian";
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

interface BreakProps {
	duration: number;
	onBreakComplete: (skipBreak?: boolean) => void;
}

const buttonStyles = {
	base: {
		padding: '8px 16px',
		margin: '0 8px',
		borderRadius: '4px',
		cursor: 'pointer',
		fontWeight: 500,
		transition: 'all 0.3s ease',
		height: '36px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	skip: {
		backgroundColor: '#f44336',
		color: 'white',
		border: 'none',
		'&:hover': {
			backgroundColor: '#d32f2f',
		}
	}
};

const Break: React.FC<BreakProps> = ({ duration, onBreakComplete }) => {
	const [isActive, setIsActive] = useState(true);
	const [key] = useState(0);

	const handleSkip = () => {
		setIsActive(false);
		onBreakComplete(true);
	};

	return (
		<div className="pomodoro-box">
			<div className="pomodoro-task">休息时间</div>
			<CountdownCircleTimer
				isPlaying={isActive}
				duration={duration * 60}
				colors={['#004777', '#F7B801', '#A30000', '#A30000']}
				colorsTime={[
					duration * 60,
					Math.round(duration * 60 / 5),
					Math.round(duration * 60 / 12.5),
					0
				]}
				onComplete={() => {
					new Notice("休息时间结束！");
					onBreakComplete(false);
					return { shouldRepeat: false };
				}}
				key={key}
			>
				{({ remainingTime }) => {
					const minutes = Math.floor(remainingTime / 60);
					const seconds = remainingTime % 60;
					return <span className='pomodoro-remain'>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>;
				}}
			</CountdownCircleTimer>

			<div style={{ height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div className='pomodoro-action' style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
					<div
						className='pomodoro-btn'
						onClick={handleSkip}
						style={{
							...buttonStyles.base,
							...buttonStyles.skip
						}}
					>
						跳过休息
					</div>
				</div>
			</div>
		</div>
	);
};

export default Break; 
