import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import * as React from "react";
import { useState, useEffect } from "react";
const DURATION = 25 * 60;
function ReactView(props: {
	taskText: string;
	onStop: (actualTimeElapsed: number) => void;
}) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [key, setKey] = useState(0);
	const [actualTimeElapsed, setActualTimeElapsed] = useState(0);
	const [needNext, setNeedNext] = useState(false);
	useEffect(() => {
		setIsPlaying(true)
	}, [])
	const handleFinish = (actualTimeElapsed: number) => {
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
	};
	const handleNew = () => {
		setIsPlaying(true);
		setKey(prevKey => prevKey + 1);
		setNeedNext(false)
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
			colorsTime={[25, 5, 2, 0]}
			key={key}
		>
			{({ remainingTime }) => {
				const minutes = Math.floor(remainingTime / 60);
				const seconds = remainingTime % 60;
				return <span className='pomodoro-remain'>{minutes}:{seconds}</span>;
			}}
		</CountdownCircleTimer>
		{
			needNext ? <div className='pomodoro-new-btn' onClick={handleNew}>NEW</div> :
				<div className='pomodoro-action'>
					<div className='pomodoro-btn' onClick={() => handleFinish(actualTimeElapsed)}>FINISH</div>
					<div className='pomodoro-btn' onClick={handlePause}>{isPlaying ? 'PAUSE' : 'RESUME'}</div>
					<div className='pomodoro-btn' onClick={handleCancel}>CANCEL</div>
				</div>
		}


	</div>;
}

export default ReactView;
