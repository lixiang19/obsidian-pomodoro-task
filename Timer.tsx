import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import * as React from "react";
import { useState, useEffect } from "react";

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
	finish: {
		backgroundColor: '#4CAF50',
		color: 'white',
		border: 'none',
		'&:hover': {
			backgroundColor: '#45a049',
		}
	},
	pause: {
		backgroundColor: '#2196F3',
		color: 'white',
		border: 'none',
		'&:hover': {
			backgroundColor: '#1976D2',
		}
	},
	cancel: {
		backgroundColor: '#f44336',
		color: 'white',
		border: 'none',
		'&:hover': {
			backgroundColor: '#d32f2f',
		}
	},
	new: {
		backgroundColor: '#4CAF50',
		color: 'white',
		border: 'none',
		padding: '8px 16px',
		borderRadius: '4px',
		cursor: 'pointer',
		fontWeight: 500,
		fontSize: '16px',
		transition: 'all 0.3s ease',
		'&:hover': {
			backgroundColor: '#45a049',
			transform: 'translateY(-2px)',
		}
	}
};

function ReactView(props: {
	taskText: string;
	duration: number;
	onStop: (actualTimeElapsed: number) => void;
	autoStart?: boolean;
}) {
	const DURATION = props.duration * 60;
	const [isPlaying, setIsPlaying] = useState(false);
	const [key, setKey] = useState(0);
	const [actualTimeElapsed, setActualTimeElapsed] = useState(0);
	const [needNext, setNeedNext] = useState(false);
	const [isInitial, setIsInitial] = useState(!props.autoStart);

	useEffect(() => {
		if (props.autoStart) {
			setIsPlaying(true);
			setIsInitial(false);
		}
	}, [props.autoStart]);

	const handleFinish = (actualTimeElapsed: number) => {
		console.log('完成', actualTimeElapsed)
		props.onStop(actualTimeElapsed);
		setIsPlaying(false);
		setKey(prevKey => prevKey + 1); // incrementing key will reset the timer
		setNeedNext(true)
	};

	const handlePause = () => {
		setIsPlaying(!isPlaying);
	};

	const handleCancel = () => {
		setIsPlaying(false);
		setKey(prevKey => prevKey + 1); // incrementing key will reset the timer
		setNeedNext(true);
		setIsInitial(false);
	};
	const handleNew = () => {
		setIsPlaying(true);
		setKey(prevKey => prevKey + 1);
		setNeedNext(false);
		setIsInitial(false);
	}
	return <div className='pomodoro-box'>
		<div className='pomodoro-task'> {props.taskText}</div>
		<CountdownCircleTimer
			isPlaying={isPlaying}
			onComplete={() => { handleFinish(DURATION / 60) }}
			onUpdate={(remainingTime) => {
				{

					const seconds = Math.round((DURATION - remainingTime) / 60)
					setActualTimeElapsed(seconds)
				}
			}}
			duration={DURATION}
			colors={['#004777', '#F7B801', '#A30000', '#A30000']}
			colorsTime={[
				props.duration * 60,
				Math.round(props.duration * 60 / 5),
				Math.round(props.duration * 60 / 12.5),
				0
			]}
			key={key}
		>
			{({ remainingTime }) => {
				const minutes = Math.floor(remainingTime / 60);
				const seconds = remainingTime % 60;
				return <span className='pomodoro-remain'>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>;
			}}
		</CountdownCircleTimer>
		<div style={{ height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			{
				isInitial || needNext ?
					<div style={{ display: 'flex', justifyContent: 'center' }}>
						<div
							className='pomodoro-new-btn'
							onClick={handleNew}
							style={{
								...buttonStyles.base,
								...buttonStyles.new,
							}}
						>
							开始
						</div>
					</div> :
					<div className='pomodoro-action' style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
						<div
							className='pomodoro-btn'
							onClick={() => handleFinish(actualTimeElapsed)}
							style={{ ...buttonStyles.base, ...buttonStyles.finish }}
						>
							完成
						</div>
						<div
							className='pomodoro-btn'
							onClick={handlePause}
							style={{ ...buttonStyles.base, ...buttonStyles.pause }}
						>
							{isPlaying ? '暂停' : '继续'}
						</div>
						<div
							className='pomodoro-btn'
							onClick={handleCancel}
							style={{ ...buttonStyles.base, ...buttonStyles.cancel }}
						>
							放弃
						</div>
					</div>
			}
		</div>
	</div>;
}

export default ReactView;
