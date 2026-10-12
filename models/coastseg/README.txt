Doodleverse/CoastSeg Segformer models for 4-class (water, whitewater, sediment and other) segmentation of PlanetScope, Sentinel-2 and Landsat-5/7/8/9 visible-band (RGB) images of coasts. 'Global' version.

These Segformer model data are based on RGB (red, green, and blue) images of coasts and associated labels.

Models have been created using Segmentation Gym*

Classes: {0=water, 1=whitewater, 2=sediment, 3=other}

Model validation accuracy statistics

The overall accuracy, mean frequency weighted IoU, mean IoU, Matthews correlation for the best model (v2) are shown below:

v2: .94, .90, .60, 0.85

Per sample and per-class validation statistics are provided in the csv files associated with this release

(full error analysis will be presented in a forthcoming paper)

File descriptions

For each model, there are 5 files with the same root name:

1. '.json' config file: this is the file that was used by Segmentation Gym* to create the weights file. It contains instructions for how to make the model and the data it used, as well as instructions for how to use the model for prediction. It is a handy wee thing and mastering it means mastering the entire Doodleverse.

2. '.h5' weights file: this is the file that was created by the Segmentation Gym* function `train_model.py`. It contains the trained model's parameter weights. It can called by the Segmentation Gym* function  `seg_images_in_folder.py`. Models may be ensembled.

3. '_modelcard.json' model card file: this is a json file containing fields that collectively describe the model origins, training choices, and dataset that the model is based upon. There is some redundancy between this file and the `config` file (described above) that contains the instructions for the model training and implementation. The model card file is not used by the program but is important metadata so it is important to keep with the other files that collectively make the model and is such is considered part of the model

4. '_model_history.npz' model training history file: this numpy archive file contains numpy arrays describing the training and validation losses and metrics. It is created by the Segmentation Gym function `train_model.py`

5. '.png' model training loss and mean IoU plot: this png file contains plots of training and validation losses and mean IoU scores during model training. A subset of data inside the .npz file. It is created by the Segmentation Gym function `train_model.py`

6. '.csv' model training and validation statistics per validation and training sample, and per class. F1 score, Precision, Recall, mean IoU, Overall Accuracy, frequency weighted IoU, and Matthews Correlation Coefficient metrics are provided.

Additionally, BEST_MODEL.txt contains the name of the model with the best validation loss and mean IoU

This is an UPGRADES and improves upon https://zenodo.org/records/8190958 

See https://satelliteshorelines.github.io/CoastSeg/models/ and Fitzpatrick et al., (2024)** for more information about how these models are used

References

*Segmentation Gym: Buscombe, D., & Goldstein, E. B. (2022). A reproducible and reusable pipeline for segmentation of geoscientific imagery. Earth and Space Science, 9, e2022EA002332. https://doi.org/10.1029/2022EA002332 See: https://github.com/Doodleverse/segmentation_gym

** Fitzpatrick et al., (2024). CoastSeg: an accessible and extendable hub for satellite-derived-shoreline (SDS) detection and mapping. Journal of Open Source Software, 9(99), 6683, https://doi.org/10.21105/joss.06683