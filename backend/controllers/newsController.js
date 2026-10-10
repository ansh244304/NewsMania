import {
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
  fetchNewsAPI
} from "../services/newsService.js";

import {
  fetchPIBNews
} from "../services/pibService.js";


// ======================================================
// CREATE NEWS
// ======================================================

export const createNewsController = async (
  req,
  res
) => {

  try {

    const news =
      await createNews(
        req.body
      );

    res.status(201).json({

      success: true,

      message:
        "News created successfully",

      news

    });

  } catch (error) {

    console.error(
      "Create News Error:",
      error.message
    );

    res.status(400).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// GET ALL NEWS
// ======================================================

export const getAllNewsController = async (
  req,
  res
) => {

  try {

    const {

      page = 1,

      limit = 10,

      search = "",

      category = "",

      source = ""

    } = req.query;


    const result =
      await getAllNews({

        page,

        limit,

        search,

        category,

        source

      });


    res.status(200).json({

      success: true,

      ...result

    });

  } catch (error) {

    console.error(
      "Get All News Error:",
      error.message
    );

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// GET NEWS BY ID
// ======================================================

export const getNewsByIdController = async (
  req,
  res
) => {

  try {

    const news =
      await getNewsById(
        req.params.id
      );


    res.status(200).json({

      success: true,

      news

    });

  } catch (error) {

    console.error(
      "Get News Error:",
      error.message
    );

    res.status(404).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// UPDATE NEWS
// ======================================================

export const updateNewsController = async (
  req,
  res
) => {

  try {

    const news =
      await updateNews(

        req.params.id,

        req.body

      );


    res.status(200).json({

      success: true,

      message:
        "News updated successfully",

      news

    });

  } catch (error) {

    console.error(
      "Update News Error:",
      error.message
    );

    res.status(400).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// DELETE NEWS
// ======================================================

export const deleteNewsController = async (
  req,
  res
) => {

  try {

    await deleteNews(
      req.params.id
    );


    res.status(200).json({

      success: true,

      message:
        "News deleted successfully"

    });

  } catch (error) {

    console.error(
      "Delete News Error:",
      error.message
    );

    res.status(404).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// FETCH PIB NEWS
// ======================================================

export const fetchPIBNewsController = async (
  req,
  res
) => {

  try {

    const news =
      await fetchPIBNews();


    res.status(200).json({

      success: true,

      message:
        "PIB news fetched successfully",

      count:
        news.length,

      news

    });

  } catch (error) {

    console.error(
      "PIB Fetch Error:",
      error.message
    );

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};


// ======================================================
// FETCH GNEWS
// ======================================================

export const fetchNewsAPIController = async (
  req,
  res
) => {

  try {

    const {

      query = "India",

      page = 1,

      max = 10

    } = req.query;


    const news =
      await fetchNewsAPI({

        query,

        page,

        max

      });


    res.status(200).json({

      success: true,

      message:
        "GNews articles saved successfully",

      count:
        news.length,

      news

    });

  } catch (error) {

    console.error(
      "GNews Controller Error:",
      error.message
    );


    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};