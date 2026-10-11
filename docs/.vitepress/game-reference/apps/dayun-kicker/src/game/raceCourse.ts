import type { TrackId } from "./track";
import { RACE_COURSES } from "../config/gameplay/courses";

/** Race rules are shared by simulation, records, scenery and UI. */
export const raceCourse = (track: TrackId) => track === "commute" ? RACE_COURSES.commute : RACE_COURSES.loop;
export const raceDistance = (track: TrackId) => { const course = raceCourse(track); return course.length * course.laps; };
