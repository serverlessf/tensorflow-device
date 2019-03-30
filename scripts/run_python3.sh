cd /usr/src/app
if [ ! -f "pip_install.log" ]; then
  pip install -r requirements.txt > pip_install.log
fi
python dev.py "$@"
