# upload image to server
curl -X POST "http://localhost:8000/upload-image/" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/Users/lowrenhwa/Desktop/kanta/encode-faces/images/family.jpg"

http --form POST localhost:8000/upload-image/ image@/full/path/to/photo.jpg

# get image list
curl -G http://localhost:8000/blob/pics

# curl -G http://localhost:8000/blob/pics \
#      --data-urlencode "limit=20" \
#      --data-urlencode "faces_min=1" \
#      --data-urlencode "faces_max=3" \
#      --data-urlencode "date_from=2025-05-01T00:00:00Z" \
#      --data-urlencode "date_to=2025-05-10T23:59:59Z"

# get next page of image list
curl -G http://localhost:8000/blob/pics \
     --data-urlencode 'limit=1' \
     --data-urlencode 'continuation_token=2!120!MDAwMDQ0IXVwbG9hZHMvYmVhMWNhMjkyNDg2NDZhN2JkM2VmMDdkZTliNjE3NDkuanBnITAwMDAyOCE5OTk5LTEyLTMxVDIzOjU5OjU5Ljk5OTk5OTlaIQ--'

# get image by id
curl -X GET http://localhost:8000/blob/pics/bea1ca29248646a7bd3ef07de9b61749





# import requests

# url = "http://localhost:8000/upload-image/"
# files = {"image": open("/full/path/to/photo.jpg", "rb")}

# resp = requests.post(url, files=files)
# print(resp.status_code, resp.json())
