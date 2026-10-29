#!/bin/sh
# Join filmed pieces (film/out/<name>1, 2, …: folders of numbered JPEGs) into one vertical video with a half-second
# cross-fade between them and a soft rain under it, one loudness per piece (0 = dry, 1 = a downpour).
# film/make.sh cafes 0.35 0.8 0.03  →  film/out/cafes.mp4 (and cafes-silent.mp4)
set -e
name=$1; shift
cd "$(dirname "$0")/out"
F=0.5; n=0; ins=""; xf=""; prev="0"; off=0; R=""; close=""
for lv in "$@"; do
  n=$((n + 1))
  ffmpeg -y -loglevel error -framerate 30 -i "$name$n/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 "$name-seg$n.mp4"
  ins="$ins -i $name-seg$n.mp4"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$name-seg$n.mp4")
  if [ $n -gt 1 ]; then
    xf="$xf[$prev][$((n - 1))]xfade=transition=fade:duration=$F:offset=$off[v$n];"; prev="v$n"
    R="${R}if(lt(t,$off),$last,if(lt(t,$off+$F),$last+($lv-$last)*(t-$off)/$F,"; close="$close))"
  fi
  last=$lv; off=$(echo "$off + $d - $F" | bc)
done
T=$(echo "$off + $F" | bc); R="$R$last$close"
vmap="[$prev]"; [ $n -gt 1 ] || vmap="0:v" # (one piece: its own picture, no cross-fade)
ffmpeg -y -loglevel error $ins \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$T:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.5:duration=$T:sample_rate=48000" \
  -filter_complex "$xf[$n]highpass=f=400,lowpass=f=5200[p];[$((n + 1))]lowpass=f=420[b];[p][b]amix=inputs=2:weights=1 0.6,volume='$R':eval=frame,volume=3,afade=t=in:d=0.6,afade=t=out:st=$(echo "$T - 1" | bc):d=1[au]" \
  -map "$vmap" -map "[au]" -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 160k -movflags +faststart "$name.mp4"
ffmpeg -y -loglevel error -i "$name.mp4" -an -c:v copy "$name-silent.mp4"
echo "film/out/$name.mp4  ($T s)"
