#!/bin/sh
# Join one filmed piece (film/out/<name>1) into a vertical video with waves under it: soft swells breaking every eight seconds or so.
# film/make-sea.sh okinawa  →  film/out/okinawa.mp4 (and okinawa-silent.mp4)
set -e
name=$1
cd "$(dirname "$0")/out"
ffmpeg -y -loglevel error -framerate 30 -i "${name}1/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 "$name-silent.mp4"
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$name-silent.mp4")
ffmpeg -y -loglevel error -i "$name-silent.mp4" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$T:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.5:duration=$T:sample_rate=48000" \
  -filter_complex "[1]highpass=f=250,lowpass=f=3800,volume='0.12+0.55*pow(0.5+0.5*sin(2*PI*t/8.3),3)+0.25*pow(0.5+0.5*sin(2*PI*t/5.1+1),4)':eval=frame[wash];[2]lowpass=f=300,volume='0.5+0.4*sin(2*PI*t/8.3-0.8)':eval=frame[low];[wash][low]amix=inputs=2:weights=1 0.7,volume=1.6,afade=t=in:d=0.8,afade=t=out:st=$(echo "$T - 1.2" | bc):d=1.2[au]" \
  -map 0:v -map "[au]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$name.mp4"
echo "film/out/$name.mp4  ($T s)"
