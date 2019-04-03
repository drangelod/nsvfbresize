<template>
  <Page actionBarHidden="true" backgroundSpanUnderStatusBar="true">
    <StackLayout>
      <GridLayout class="action-bar" rows="*" columns="50,2*,50">
        <Label col="0" row="0" class="fas" @tap="$navigateBack()" :text="'\uf060'"/>
        <Label col="1" row="0" class="header" text="Change Picture"/>
      </GridLayout>
      <Image id="image" :src="pictureSource" class="profile-picture-edit"/>
      <GridLayout columns="70,62,*" rows="60,10,60">
        <Label
          row="0"
          col="1"
          id="buttonCamera"
          :text="'\uf083'"
          @tap="takePicture"
          class="fas take-picture-icon"
        ></Label>
        <Label row="0" col="2" text="Take a picture" class="desc-text"/>
        <Label
          row="2"
          col="1"
          id="buttonImage"
          :text="'\uf1c5'"
          @tap="chooseImage"
          class="fas take-picture-icon"
        ></Label>
        <Label row="2" col="2" text="Choose an image" class="desc-text"/>
      </GridLayout>
      <GridLayout columns="*,*">
        <Button text="Confirm" class="save" @tap="saveProfilePic" col="0"/>
        <Button text="Cancel" class="cancel" @tap="saveCancelPic" col="1"/>
      </GridLayout>
    </StackLayout>
  </Page>
</template>
<script>
import { mapState, mapGetters } from "vuex";
const cameraModule = require("nativescript-camera");
const imagepicker = require("nativescript-imagepicker");
const imageSourceModule = require("tns-core-modules/image-source");
const imageAssetModule = require("tns-core-modules/image-asset/image-asset");
import { isAndroid, isIOS } from "tns-core-modules/platform";
import firebase from "nativescript-plugin-firebase";
import { path, knownFolders } from "tns-core-modules/file-system";
var LoadingIndicator = require("nativescript-loading-indicator")
  .LoadingIndicator;
var loader = new LoadingIndicator();
const utilsModule = require("utils/utils");
//var context = imagepicker.create({ mode: "single" }); // use "multiple" for multiple selection
export default {
  name: "picture-modal",
  data() {
    return {
      pictureSource: "",
      origSource: "",
      newFilename: ""
    };
  },
  components: {},
  computed: {},
  mounted() {
    this.pictureSource = this.$store.state.profile.profile_pic;
    this.origSource = this.$store.state.profile.profile_pic;
    if (cameraModule.isAvailable()) {
      //checks to make sure device has a camera
    } else {
      //ignore this on simulators for now
    }
    cameraModule.requestPermissions().then(
      //request permissions for camera
      success => {
        //have permissions
      },
      failure => {
        //no permissions for camera,disable picture button?
      }
    );
  },
  methods: {
    takePicture() {
      cameraModule
        .takePicture({
          width: 400, //these are in device independent pixels
          keepAspectRatio: true, //    keepAspectRatio is enabled.
          saveToGallery: false //Don't save a copy in local gallery, ignored by some Android devices
        })
        .then(imageAsset => {
          imageAsset.options.autoScaleFactor = false;
          imageAsset.options.keepAspectRatio = true;
          imageAsset.options.width = 400;

          //save to file
          imageSourceModule.fromAsset(imageAsset).then(
            imageSource => {
              var ratio = 400 / imageSource.width;
              var newheight = imageSource.height * ratio;
              var newwidth = imageSource.width * ratio;
              if (imageSource.width > 400) {
                console.log(
                  "Resizing original image dimentions from : " +
                    imageSource.height +
                    " x " +
                    imageSource.width +
                    " to " +
                    newheight +
                    " x " +
                    newwidth
                );
                if (isIOS) {
                  console.log("Ignoring resize for camera images on iOS");
                  let filename =
                    this.$store.state.profile.id +
                    "-" +
                    new Date().getTime() +
                    ".jpg";
                  let folder = knownFolders.documents();
                  let fullpath = path.join(folder.path, filename);
                  let saved = imageSource.saveToFile(fullpath, "jpeg");
                  if (saved) {
                    this.pictureSource = fullpath;
                    this.newFilename = filename;
                    console.log(
                      "image imensions: " +
                        imageSource.height +
                        " x " +
                        imageSource.width
                    );
                  } else {
                    console.log(
                      "Error! Unable to save photo to local file for upload"
                    );
                  }
                } else if (isAndroid) {
                  try {
                    var downsampleOptions = new android.graphics.BitmapFactory.Options();
                    downsampleOptions.inSampleSize = this.getSampleSize(
                      imageAsset.android,
                      { maxWidth: newwidth, maxHeight: newheight }
                    );
                    var bitmap = android.graphics.BitmapFactory.decodeFile(
                      imageAsset.android,
                      downsampleOptions
                    );
                    imageSource.setNativeSource(bitmap);

                    let filename =
                      this.$store.state.profile.id +
                      "-" +
                      new Date().getTime() +
                      ".jpg";
                    let folder = knownFolders.documents();
                    let fullpath = path.join(folder.path, filename);
                    let saved = imageSource.saveToFile(fullpath, "jpeg");

                    if (saved) {
                      this.pictureSource = fullpath;
                      this.newFilename = filename;
                      console.log(
                        "Resized image imensions: " +
                          imageSource.height +
                          " x " +
                          imageSource.width
                      );
                    } else {
                      console.log(
                        "Error! Unable to save image to local file for saving"
                      );
                    }
                    loader.hide();
                  } catch (err) {
                    console.log(err);
                    loader.hide();
                  }
                }
              } else {
                let saved = false;
                let filePath = "";
                const folderPath = knownFolders.documents().path;
                let fileName =
                  this.$store.state.profile.id +
                  "-" +
                  new Date().getTime() +
                  ".jpg";
                console.log(
                  "saving image " + fileName + " to path " + folderPath
                );
                filePath = path.join(folderPath, fileName);
                saved = imageSource.saveToFile(filePath, "jpeg");

                if (saved) {
                  this.pictureSource = filePath;
                  this.newFilename = fileName;
                } else {
                  console.log(
                    "Error! Unable to save image to local file for saving"
                  );
                }
                loader.hide();
              }
            },
            err => {
              console.log("Failed to load from asset");
            }
          );
        })
        .catch(err => {
          console.error(err);
        });
    },
    getSampleSize(uri, options) {
      var scale = 1;
      if (isAndroid) {
        var boundsOptions = new android.graphics.BitmapFactory.Options();
        boundsOptions.inJustDecodeBounds = true;
        android.graphics.BitmapFactory.decodeFile(uri, boundsOptions);

        // Find the correct scale value. It should be the power of 2.
        var outWidth = boundsOptions.outWidth;
        var outHeight = boundsOptions.outHeight;

        if (options) {
          var targetSize =
            options.maxWidth < options.maxHeight
              ? options.maxWidth
              : options.maxHeight;
          while (
            !(
              this.matchesSize(targetSize, outWidth) ||
              this.matchesSize(targetSize, outHeight)
            )
          ) {
            outWidth /= 2;
            outHeight /= 2;
            scale *= 2;
          }
        }
      }
      return scale;
    },
    matchesSize(targetSize, actualSize) {
      return targetSize && actualSize / 2 < targetSize;
    },
    chooseImage() {
      let pickcontext = imagepicker.create({ mode: "single" });
      try {
        pickcontext
          .authorize()
          .then(() => {
            return pickcontext.present();
          })
          .then(selection => {
            const imageAsset = selection.length > 0 ? selection[0] : null;
            imageAsset.options = {
              width: 400,
              keepAspectRatio: true,
              autoScaleFactor: false
            };
            loader.show();
            imageSourceModule
              .fromAsset(imageAsset)
              .then(imageSource => {
                var ratio = 400 / imageSource.width;
                var newheight = imageSource.height * ratio;
                var newwidth = imageSource.width * ratio;
                if (imageSource.width > 400) {
                  console.log(
                    "Resizing original image dimentions from : " +
                      imageSource.height +
                      " x " +
                      imageSource.width +
                      " to " +
                      newheight +
                      " x " +
                      newwidth
                  );
                  if (isIOS) {
                    try {
                      let that = this;
                      let manager = PHImageManager.defaultManager();
                      let options = new PHImageRequestOptions();

                      options.resizeMode =
                        PHImageRequestOptionsResizeMode.Exact;
                      options.deliveryMode = PHImageRequestOptionsDeliveryModeHighQualityFormat;
                      manager.requestImageForAssetTargetSizeContentModeOptionsResultHandler(
                        imageAsset.ios,
                        { width: newwidth, height: newheight },
                        PHImageContentModeAspectFill,
                        options,
                        function(result, info) {
                          let saved = false;
                          let filePath = "";
                          const folderPath = knownFolders.documents().path;
                          let fileName =
                            that.$store.state.profile.id +
                            "-" +
                            new Date().getTime() +
                            ".jpg";
                          console.log(
                            "saving image " +
                              fileName +
                              " to path " +
                              folderPath
                          );
                          console.log(
                            "Original image dimentions: " +
                              imageSource.height +
                              " x " +
                              imageSource.width
                          );
                          filePath = path.join(folderPath, fileName);
                          let newasset = new imageAssetModule.ImageAsset(
                            result
                          );

                          imageSourceModule
                            .fromAsset(newasset)
                            .then(newimageSource => {
                              saved = newimageSource.saveToFile(
                                filePath,
                                "jpeg"
                              );
                              if (saved) {
                                that.pictureSource = filePath;
                                that.newFilename = fileName;
                                console.log(
                                  "Resized image imensions: " +
                                    newimageSource.height +
                                    " x " +
                                    newimageSource.width
                                );
                              } else {
                                console.log(
                                  "Error! Unable to save image to local file for saving"
                                );
                              }
                              loader.hide();
                            });
                        }
                      );
                    } catch (e) {
                      console.log("err: " + e);
                      console.log("stack: " + e.stack);
                    }
                  } else if (isAndroid) {
                    try {
                      var downsampleOptions = new android.graphics.BitmapFactory.Options();
                      downsampleOptions.inSampleSize = this.getSampleSize(
                        imageAsset.android,
                        { maxWidth: newwidth, maxHeight: newheight }
                      );
                      var bitmap = android.graphics.BitmapFactory.decodeFile(
                        imageAsset.android,
                        downsampleOptions
                      );
                      imageSource.setNativeSource(bitmap);

                      let filename =
                        this.$store.state.profile.id +
                        "-" +
                        new Date().getTime() +
                        ".jpg";
                      let folder = knownFolders.documents();
                      let fullpath = path.join(folder.path, filename);
                      let saved = imageSource.saveToFile(fullpath, "jpeg");

                      if (saved) {
                        this.pictureSource = fullpath;
                        this.newFilename = filename;
                        console.log(
                          "Resized image imensions: " +
                            imageSource.height +
                            " x " +
                            imageSource.width
                        );
                      } else {
                        console.log(
                          "Error! Unable to save image to local file for saving"
                        );
                      }
                      loader.hide();
                    } catch (err) {
                      console.log(err);
                      loader.hide();
                    }
                  }
                } else {
                  let saved = false;
                  let filePath = "";
                  const folderPath = knownFolders.documents().path;
                  let fileName =
                    this.$store.state.profile.id +
                    "-" +
                    new Date().getTime() +
                    ".jpg";
                  console.log(
                    "saving image " + fileName + " to path " + folderPath
                  );
                  filePath = path.join(folderPath, fileName);
                  saved = imageSource.saveToFile(filePath, "jpeg");

                  if (saved) {
                    this.pictureSource = filePath;
                    this.newFilename = fileName;
                  } else {
                    console.log(
                      "Error! Unable to save image to local file for saving"
                    );
                  }
                  loader.hide();
                }
              })
              .catch(err => {
                console.log(err);
                loader.hide();
              });
          })
          .catch(err => {
            console.log(err);
            loader.hide();
          });
      } catch (err) {
        alert("Please select a valid image.");
        console.log(err);
        loader.hide();
      }
    },
    saveCancelPic() {
      this.pictureSource = this.origSource;
      this.$navigateBack();
    },
    saveProfilePic() {
      loader.show();
      if (this.pictureSource != this.origSource) {
        //upload this picture choice to firebase storage and get url
        //use this url for profile pic and save to firebase
        var filename = this.newFilename;
        console.log("Uploading with filename " + filename);
        firebase.storage
          .uploadFile({
            // the full path of the file in your Firebase storage (folders will be created)
            remoteFullPath: "uploads/profile_pic/" + filename,
            // option 2: a full file path (ignored if 'localFile' is set)
            localFullPath: this.pictureSource,
            // get notified of file upload progress
            onProgress: function(status) {
              console.log("Uploaded fraction: " + status.fractionCompleted);
              console.log("Percentage complete: " + status.percentageCompleted);
            }
          })
          .then(
            uploadedFile => {
              firebase.storage
                .getDownloadUrl({
                  // the full path of an existing file in your Firebase storage
                  remoteFullPath: "uploads/profile_pic/" + filename
                })
                .then(
                  url => {
                    this.pictureSource = url;
                    this.$store.commit("setProfilePicture", url);
                    loader.hide();
                    this.$navigateBack();
                  },
                  function(error) {
                    console.log("Error: " + error);
                    alert("Unable to update profile pic!");
                    loader.hide();
                  }
                )
                .catch(err => {
                  console.error(err);
                  alert("Unable to update profile pic!");
                  loader.hide();
                });
            },
            function(error) {
              alert("Unable to update profile pic!");
              console.log("File upload error: " + error);
              loader.hide();
            }
          )
          .catch(err => {
            alert("Unable to update profile pic!");
            console.error(err);
            loader.hide();
          });
      } else {
        console.log("No change in pic to save");
      }
    }
  }
};
</script>
<style scoped>
.take-picture-icon {
  horizontal-align: center;
  background-color: rgb(234, 234, 236);
  padding: 12;
  border-width: 1.2;
  border-color: black;
  border-radius: 14;
  margin-top: 20;
  color: black;
  font-size: 30;
  height: 80;
  width: 80;
}
.close-button {
  horizontal-align: stretch;
  text-align: center;
  color: white;
  background-color: #1b1c1d;
  height: 36;
}
.profile-picture-edit {
  width: 200;
  height: 200;
  border-width: 0.6;
  border-color: black;
  margin-top: 16;
  margin-bottom: 16;
  vertical-align: top;
  horizontal-align: center;
}
.save {
  horizontal-align: stretch;
  text-align: center;
  color: white;
  background-color: #0011f8;
  height: 36;
}

.cancel {
  horizontal-align: stretch;
  text-align: center;
  color: white;
  background-color: #1b1c1d;
  height: 36;
}
.desc-text {
  horizontal-align: left;
  vertical-align: center;
  margin-left: 20;
  margin-top: 20;
}
</style>